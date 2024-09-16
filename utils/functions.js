import { createConnection } from 'mysql2/promise';
require('dotenv').config();


export async function connectDb() {

  const chartDbConfig = {
    host: process.env.mySqlDbHost,
    user: process.env.mySqlDbUser,
    database: process.env.mySqlDbName,
    password: process.env.mySqlDbPass,
  };
  
  return createConnection(chartDbConfig);

}

export async function checkForPreexistingRecords(dbConnection, symbol, timestamp) {

  const timestampFromDb = await dbConnection.execute(
    `SELECT timestamp_msec FROM candlesticks_m1 WHERE symbol = ? ORDER BY timestamp_msec DESC`,
    [symbol]
  );
  await dbConnection.end();

  if (timestampFromDb.length > 0) {
    console.log(timestamp, timestampFromDb)
    const lastTimestamp = timestampFromDb[0][0].timestamp_msec;
    return timestamp <= lastTimestamp;
  }

  return false
}