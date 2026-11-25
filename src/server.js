
const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessão
app.use(session({
    secret: "eletro-store-chave-secreta",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60
    }
}));

// ROTAS DE PÁGINAS
app.use("/", require("./routes/pages"));

// ROTAS DE AUTENTICAÇÃO
app.use("/api", require("./routes/auth"));

// ROTAS DE PRODUTOS
app.use("/api/products", require("./routes/products"));

// ROTAS DE ESTOQUE
app.use("/api/stock", require("./routes/stock"));

// ROTAS DE VENDAS
app.use("/api/sales", require("./routes/sales"));

// ROTAS DE DOCUMENTOS
app.use("/api/documents", require("./routes/documents"));

// ROTAS DE PAGAMENTOS
app.use("/api/payments", require("./routes/payments"));

app.use("/api/admin", require("./routes/admin"));

// Arquivos públicos (CSS, JS, imagens)
app.use(express.static(path.join(__dirname, "public")));

// Inicialização
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Servidor Online em : http://localhost:${PORT}`);
});
