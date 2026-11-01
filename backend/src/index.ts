import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Transaction Ledger API running on port ${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
});

