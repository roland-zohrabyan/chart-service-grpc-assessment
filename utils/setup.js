const protoLoader = require("@grpc/proto-loader");
const grpc = require("@grpc/grpc-js");
import * as utils from "../utils/functions"


const PROTO_PATH = "./protos/chart_service.proto";

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, // preserving the case of field names
  longs: String, // converting long values to strings
  enums: String, // representing enums as strings
  defaults: true, // filling in default values
  oneofs: true, // handling oneof fields explicitly
});

// loading the .proto file and converting the protobuf definitions into JS objects
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const exinity = protoDescriptor.exinity.test;
const { ChartService, Timeframe } = exinity;

export async function initServerAndService() {
  const server = new grpc.Server();

  server.addService(ChartService.service, {
    Subscribe: (call) => {
      const { timeframe, symbol_list } = call.request;

      // checking if symbol_list is falsy or empty
      if (!symbol_list || symbol_list.length === 0) {
        return call.emit("error", {
          code: grpc.status.INVALID_ARGUMENT,
          message: "Symbol list cannot be empty or falsy.",
        });
      }

      // checking if timeframe is falsy or empty
      if (!timeframe || timeframe.length === 0) {
        return call.emit("error", {
          code: grpc.status.INVALID_ARGUMENT,
          message: "Timeframe cannot be empty or falsy.",
        });
      }

      // checking if the timeframe values are valid
      const validTimeframes = Timeframe.type.value.map((tf) => tf.name);
      if (!validTimeframes.includes(timeframe)) {
        return call.emit("error", {
          code: grpc.status.INVALID_ARGUMENT,
          message: `Unsupported timeframe value: ${timeframe}`,
        });
      }

      // checking if the symbol values are valid
      const validSymbolValues = [
        "VOO",
        "AAPL",
        "NVDA",
        "SPY",
        "QQQ",
        "VTI",
        "IVV",
        "VEU",
        "IXUS",
        "ACWI",
        "NO_DATA",
      ];
      for (const symbol of symbol_list) {
        if (!validSymbolValues.includes(symbol)) {
          return call.emit("error", {
            code: grpc.status.INVALID_ARGUMENT,
            message: `Unsupported symbol_list value: ${symbol}`,
          });
        }
      }

      symbol_list.forEach((symbol) => {
        const open = Math.random();
        const close = open + 1;
        const high = open + 3;
        const low = open - 3;

        // await utils.checkForPreexistingRecords()

        call.write({
          symbol,
          bar: {
            timestamp_msec: Math.floor(Date.now() / 100),
            open: symbol === "NO_DATA" ? 0 : open,
            high: symbol === "NO_DATA" ? 0 : high, 
            low: symbol === "NO_DATA" ? 0 : low,
            close: symbol === "NO_DATA" ? 0 : close,
          },
        });
      });

      call.end();
    },
  });

  return server;
}

export async function bindServer(server, port) {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to bind to port ${port}`);

    server.bindAsync(
      `127.0.0.1:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (err, port) => {
        if (err) {
          console.error(`Port ${port} is in use. Error: ${err.message}`);
          reject(err);
        } else {
          console.log("server is bound and ready");
          resolve(port);
        }
      }
    );
  });
}

// gRPC client setup
export async function initClient() {
  try {
    const client = new ChartService(
      "localhost:50051",
      grpc.credentials.createInsecure()
    );
    console.log("client is ready");
    return client;
  } catch (error) {
    console.error("Error creating client:", error.message); // Log the error message
    throw error;
  }
}
