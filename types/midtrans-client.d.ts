declare module "midtrans-client" {
  interface SnapConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }
  interface TransactionResult {
    token: string;
    redirect_url: string;
  }
  class Snap {
    constructor(config: SnapConfig);
    createTransaction(params: Record<string, unknown>): Promise<TransactionResult>;
  }
  class CoreApi {
    constructor(config: SnapConfig);
    transaction: {
      status(orderId: string): Promise<Record<string, unknown>>;
    };
  }
  export = { Snap, CoreApi };
}
