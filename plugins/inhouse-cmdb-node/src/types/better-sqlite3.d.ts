declare module 'better-sqlite3' {
  namespace Database {
    interface Statement {
      run(...params: any[]): unknown;
      get(...params: any[]): any;
      all(...params: any[]): any[];
    }

    interface Transaction {
      (): void;
    }

    interface Database {
      pragma(source: string): unknown;
      exec(source: string): void;
      prepare(source: string): Statement;
      transaction(fn: () => void): Transaction;
    }
  }

  class DatabaseImpl implements Database.Database {
    constructor(filename: string);
    pragma(source: string): unknown;
    exec(source: string): void;
    prepare(source: string): Database.Statement;
    transaction(fn: () => void): Database.Transaction;
  }

  export = DatabaseImpl;
}
