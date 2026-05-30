/**
 * Generate invoice number: INV/YYYYMMDD/0001 (sequential per day, locked in transaction)
 * @param {import('pg').PoolClient} client - Active transaction client
 * @param {Date} [date]
 * @returns {Promise<string>}
 */
const generateSequentialInvoice = async (client, date = new Date()) => {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `INV/${dateStr}/`;

  const result = await client.query(
    `SELECT invoice_number FROM transactions
     WHERE invoice_number LIKE $1
     ORDER BY invoice_number DESC
     LIMIT 1
     FOR UPDATE`,
    [`${prefix}%`]
  );

  let nextSeq = 1;
  if (result.rows.length > 0) {
    const lastInvoice = result.rows[0].invoice_number;
    const seqPart = lastInvoice.split('/').pop();
    const parsed = parseInt(seqPart, 10);
    if (!Number.isNaN(parsed)) nextSeq = parsed + 1;
  }

  if (nextSeq > 9999) {
    throw new Error('Nomor invoice harian telah mencapai batas maksimum (9999).');
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};

module.exports = { generateSequentialInvoice };
