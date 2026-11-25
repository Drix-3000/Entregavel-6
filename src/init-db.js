const Database = require("better-sqlite3");
const path = require("path");

// =========================================
// CONEXÃO COM O BANCO DE DADOS
// =========================================

const db = new Database(
    path.join(__dirname, "database", "database.sqlite")
);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");


// =========================================
// TABELA DE PRODUTOS
// =========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        image TEXT,
        price REAL NOT NULL DEFAULT 0,
        unidades INTEGER NOT NULL DEFAULT 0
    );
`);


// =========================================
// TABELA DE ADMINISTRADORES
// =========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL
    );
`);


// =================================
// TABELAS DE VENDAS
// =================================

db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        customer_document TEXT,
        sale_type TEXT NOT NULL
            CHECK(sale_type IN ('avista', 'prazo')),
        total REAL NOT NULL,
        paid_amount REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pendente',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

// =================================
// ITENS DAS VENDAS
// =================================

db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        subtotal REAL NOT NULL,

        FOREIGN KEY (sale_id)
            REFERENCES sales(id),

        FOREIGN KEY (product_id)
            REFERENCES products(id)
            ON DELETE RESTRICT
    );
`);

// =================================
// MOVIMENTAÇÕES DE ESTOQUE
// =================================

db.exec(`
    CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (product_id)
            REFERENCES products(id)
            ON DELETE RESTRICT
    );
`);

// =================================
// PAGAMENTOS
// =================================

db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (sale_id)
            REFERENCES sales(id)
    );
`);



// =========================================
// EXPORTAÇÃO DO BANCO DE DADOS
// =========================================

module.exports = db;
