/**
 * End-to-end smoke test for the Transaction Ledger API.
 *
 * Covers every requirement in the assignment:
 *   - account creation + validations
 *   - credit / debit rules
 *   - duplicate reference_id handling (per account, not global)
 *   - insufficient balance rejection
 *   - balance retrieval
 *   - transaction history: filtering, pagination, latest-first sorting
 *   - transaction immutability
 *   - atomic money transfer (bonus)
 *   - error handling consistency
 *
 * Usage:
 *   node tests/smoke.test.mjs
 *   BASE_URL=http://localhost:3000/api node tests/smoke.test.mjs
 */

const BASE = (process.env.BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push({ name, detail });
    console.log(`  FAIL  ${name}${detail ? ` -> ${JSON.stringify(detail)}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, body: json };
}

const ref = (tag) => `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function main() {
  console.log(`Testing ${BASE}`);

  section('1. Health');
  {
    const r = await api('GET', '/health');
    check('GET /health returns 200', r.status === 200);
  }

  section('2. Create account');
  let account;
  {
    const r = await api('POST', '/accounts', { name: 'Alice' });
    account = r.body?.data;
    check('POST /accounts returns 201', r.status === 201);
    check('returns a unique id', !!account?.id);
    check('initial balance is 0', account?.balance === 0);
    check('created_at is generated', !!account?.created_at);
    check('name is stored', account?.name === 'Alice');
  }

  {
    const r = await api('POST', '/accounts', { name: 'Bob' });
    check('second account created', r.status === 201);
    globalThis.bob = r.body?.data;
    check('ids are unique', r.body?.data?.id !== account.id);
  }

  section('3. Create account validations');
  {
    const r = await api('POST', '/accounts', {});
    check('missing name -> 422', r.status === 422);
    check('uses VALIDATION_ERROR code', r.body?.error?.code === 'VALIDATION_ERROR');
  }
  {
    const r = await api('POST', '/accounts', { name: '   ' });
    check('blank name -> 422', r.status === 422);
  }
  {
    const r = await api('POST', '/accounts', { name: 'Mallory', balance: 5000 });
    check('client cannot set initial balance -> 422', r.status === 422);
  }

  section('4. Get balance');
  {
    const r = await api('GET', `/accounts/${account.id}/balance`);
    check('GET balance returns 200', r.status === 200);
    check('balance is 0', r.body?.data?.balance === 0);
    check('exposes account_id', r.body?.data?.account_id === account.id);
  }
  {
    const r = await api('GET', '/accounts/2f1a6c1e-0000-4000-8000-000000000000/balance');
    check('unknown account -> 404', r.status === 404);
  }
  {
    const r = await api('GET', '/accounts/not-a-uuid/balance');
    check('malformed account id -> 400', r.status === 400);
  }

  section('5. Transactions: credit and debit');
  {
    const r = await api('POST', `/accounts/${account.id}/transactions`, {
      type: 'credit', amount: 100, reference_id: ref('CR'), description: 'Initial deposit',
    });
    check('credit 100 -> 201', r.status === 201);

    const b = await api('GET', `/accounts/${account.id}/balance`);
    check('balance is 100 after credit', b.body?.data?.balance === 100);
  }
  {
    const r = await api('POST', `/accounts/${account.id}/transactions`, {
      type: 'debit', amount: 30, reference_id: ref('DB'),
    });
    check('debit 30 -> 201', r.status === 201);

    const b = await api('GET', `/accounts/${account.id}/balance`);
    check('balance is 70 after debit', b.body?.data?.balance === 70);
  }

  section('6. Debit cannot overdraw');
  {
    const r = await api('POST', `/accounts/${account.id}/transactions`, {
      type: 'debit', amount: 1000, reference_id: ref('OVER'),
    });
    check('overdraw -> 422', r.status === 422);
    check('INSUFFICIENT_BALANCE code', r.body?.error?.code === 'INSUFFICIENT_BALANCE');

    const b = await api('GET', `/accounts/${account.id}/balance`);
    check('rejected debit left balance at 70', b.body?.data?.balance === 70);
  }

  section('7. Duplicate reference_id');
  {
    const dupRef = ref('DUP');
    const first = await api('POST', `/accounts/${account.id}/transactions`, {
      type: 'credit', amount: 10, reference_id: dupRef,
    });
    check('first use of reference_id -> 201', first.status === 201);

    const second = await api('POST', `/accounts/${account.id}/transactions`, {
      type: 'credit', amount: 10, reference_id: dupRef,
    });
    check('duplicate on same account -> 409', second.status === 409);
    check('DUPLICATE_TRANSACTION code', second.body?.error?.code === 'DUPLICATE_TRANSACTION');

    const b = await api('GET', `/accounts/${account.id}/balance`);
    check('duplicate did not change balance', b.body?.data?.balance === 80);

    const other = await api('POST', `/accounts/${globalThis.bob.id}/transactions`, {
      type: 'credit', amount: 10, reference_id: dupRef,
    });
    check('same reference_id allowed on another account', other.status === 201);

    const otherBalance = await api('GET', `/accounts/${globalThis.bob.id}/balance`);
    check('other account credited separately', otherBalance.body?.data?.balance === 10);
  }

  section('8. Transaction validations');
  for (const [label, payload] of [
    ['invalid type', { type: 'transfer', amount: 10, reference_id: ref('V') }],
    ['zero amount', { type: 'credit', amount: 0, reference_id: ref('V') }],
    ['negative amount', { type: 'credit', amount: -5, reference_id: ref('V') }],
    ['non-numeric amount', { type: 'credit', amount: 'abc', reference_id: ref('V') }],
    ['missing reference_id', { type: 'credit', amount: 10 }],
    ['blank reference_id', { type: 'credit', amount: 10, reference_id: '   ' }],
  ]) {
    const r = await api('POST', `/accounts/${account.id}/transactions`, payload);
    check(`${label} -> 422`, r.status === 422);
  }
  {
    const r = await api('POST', '/accounts/2f1a6c1e-0000-4000-8000-000000000000/transactions', {
      type: 'credit', amount: 10, reference_id: ref('NOACC'),
    });
    check('transaction on unknown account -> 404', r.status === 404);
  }

  section('9. Transaction history: sorting, filtering, pagination');
  {
    const r = await api('GET', `/accounts/${account.id}/transactions`);
    check('history returns 200', r.status === 200);
    check('returns an array', Array.isArray(r.body?.data));

    const times = r.body.data.map((t) => new Date(t.created_at).getTime());
    const sorted = [...times].sort((a, b) => b - a);
    check('latest-first ordering', JSON.stringify(times) === JSON.stringify(sorted), { times, sorted });

    check('pagination block present', !!r.body?.pagination);
    check('pagination has current_page', r.body?.pagination?.current_page === 1);
    check('pagination has page_size', r.body?.pagination?.page_size === 10);
    check('pagination has total_records', typeof r.body?.pagination?.total_records === 'number');
    check('pagination has total_pages', typeof r.body?.pagination?.total_pages === 'number');

    const total = r.body.pagination.total_records;
    check('total_records matches returned rows', r.body.data.length === Math.min(10, total), { total });
  }
  {
    const r = await api('GET', `/accounts/${account.id}/transactions?type=credit`);
    check('type filter returns 200', r.status === 200);
    check('type filter returns only credits', r.body.data.every((t) => t.type === 'credit'));

    const d = await api('GET', `/accounts/${account.id}/transactions?type=debit`);
    check('type filter returns only debits', d.body.data.every((t) => t.type === 'debit'));

    const bad = await api('GET', `/accounts/${account.id}/transactions?type=bogus`);
    check('invalid type filter -> 422', bad.status === 422);
  }
  {
    const p1 = await api('GET', `/accounts/${account.id}/transactions?page=1&limit=2`);
    const p2 = await api('GET', `/accounts/${account.id}/transactions?page=2&limit=2`);
    const total = p1.body.pagination.total_records;
    check('page 1 honours limit', p1.body.data.length === Math.min(2, total), p1.body.data.length);
    check('page 2 honours limit', p2.body.data.length === Math.max(0, Math.min(2, total - 2)), { total, got: p2.body.data.length });
    check('pagination reports page size', p1.body.pagination.page_size === 2);
    const overlap = p1.body.data.filter((a) => p2.body.data.some((b) => b.id === a.id));
    check('pages do not overlap', overlap.length === 0);
  }
  for (const q of ['page=0', 'page=-1', 'limit=0', 'limit=1000', 'page=abc']) {
    const r = await api('GET', `/accounts/${account.id}/transactions?${q}`);
    check(`invalid pagination (${q}) -> 422`, r.status === 422);
  }

  section('10. Transaction immutability');
  {
    const list = await api('GET', `/accounts/${account.id}/transactions?limit=1`);
    const txId = list.body.data[0].id;
    const put = await api('PUT', `/accounts/${account.id}/transactions/${txId}`, { amount: 999 });
    const del = await api('DELETE', `/accounts/${account.id}/transactions/${txId}`);
    check('no update endpoint (PUT rejected)', put.status === 404 || put.status === 405, put.status);
    check('no delete endpoint (DELETE rejected)', del.status === 404 || del.status === 405, del.status);
  }

  section('11. Bonus: money transfer');
  {
    const before = await api('GET', `/accounts/${account.id}/balance`);
    const from = before.body.data.balance;
    const destBefore = (await api('GET', `/accounts/${globalThis.bob.id}/balance`)).body.data.balance;

    const r = await api('POST', '/transfers', {
      source_account_id: account.id,
      destination_account_id: globalThis.bob.id,
      amount: 25,
      reference_id: ref('TRF'),
      description: 'Smoke test transfer',
    });
    check('transfer -> 201', r.status === 201 || r.status === 200, r.status);

    const after = (await api('GET', `/accounts/${account.id}/balance`)).body.data.balance;
    const destAfter = (await api('GET', `/accounts/${globalThis.bob.id}/balance`)).body.data.balance;

    check('source debited by amount', after === from - 25, { from, after });
    check('destination credited by amount', destAfter === destBefore + 25, { destBefore, destAfter });
  }
  {
    const b = (await api('GET', `/accounts/${account.id}/balance`)).body.data.balance;
    const r = await api('POST', '/transfers', {
      source_account_id: account.id,
      destination_account_id: globalThis.bob.id,
      amount: b + 1000,
      reference_id: ref('TRFOVER'),
    });
    check('transfer beyond balance -> 422', r.status === 422);

    const after = (await api('GET', `/accounts/${account.id}/balance`)).body.data.balance;
    check('failed transfer left source untouched', after === b);
  }
  {
    const r = await api('POST', '/transfers', {
      source_account_id: account.id,
      destination_account_id: account.id,
      amount: 10,
      reference_id: ref('SELF'),
    });
    check('self-transfer rejected -> 422', r.status === 422);
  }
  {
    const r = await api('POST', '/transfers', {
      source_account_id: account.id,
      destination_account_id: '2f1a6c1e-0000-4000-8000-000000000000',
      amount: 10,
      reference_id: ref('GHOST'),
    });
    check('transfer to unknown account -> 404', r.status === 404);
  }

  section('12. Consistency of error responses');
  {
    const r = await api('GET', '/nope');
    check('unknown route returns JSON error', r.body?.success === false, r.status);
  }
  {
    const res = await fetch(`${BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name": ',
    });
    const json = await res.json().catch(() => null);
    check('malformed JSON -> 400 JSON error', res.status === 400 && json?.success === false, res.status);
  }

  section('13. Final balance consistency');
  {
    const txs = [];
    let page = 1;
    let total = Infinity;
    while (txs.length < total) {
      const r = await api('GET', `/accounts/${account.id}/transactions?page=${page}&limit=100`);
      total = r.body.pagination.total_records;
      txs.push(...r.body.data);
      if (r.body.data.length === 0) break;
      page++;
    }

    const expected = txs.reduce((sum, t) => sum + (t.type === 'credit' ? Number(t.amount) : -Number(t.amount)), 0);
    const actual = (await api('GET', `/accounts/${account.id}/balance`)).body.data.balance;
    check('balance equals sum of all transactions', Number(actual) === Number(expected), { expected, actual });
    check('no negative balance', Number(actual) >= 0);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`PASSED: ${passed}   FAILED: ${failed}`);
  if (failed > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(` - ${f.name}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nTest run crashed:', err);
  process.exit(1);
});
