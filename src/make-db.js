const db = require("./init-db");

// =================================
// PRODUTOS DE EXEMPLO
// =================================

const produtos = [
    {
        nome: "Teclado Mecânico RGB",
        descricao: "Teclado mecânico com iluminação RGB",
        image: "",
        price: 189.90,
        unidades: 15
    },
    {
        nome: "Mouse Gamer",
        descricao: "Mouse gamer com 6 botões e iluminação RGB",
        image: "",
        price: 89.90,
        unidades: 20
    },
    {
        nome: "Headset Gamer",
        descricao: "Headset com microfone e áudio estéreo",
        image: "",
        price: 149.90,
        unidades: 10
    },
    {
        nome: "Monitor 24 polegadas",
        descricao: "Monitor Full HD de 24 polegadas",
        image: "",
        price: 799.90,
        unidades: 8
    },
    {
        nome: "Mousepad Gamer",
        descricao: "Mousepad grande com superfície antiderrapante",
        image: "",
        price: 49.90,
        unidades: 30
    },
    {
        nome: "Webcam Full HD",
        descricao: "Webcam 1080p para reuniões e transmissões",
        image: "",
        price: 129.90,
        unidades: 12
    },
    {
        nome: "SSD 480GB",
        descricao: "SSD SATA de 480GB",
        image: "",
        price: 219.90,
        unidades: 7
    },
    {
        nome: "Memória RAM 8GB",
        descricao: "Memória DDR4 de 8GB",
        image: "",
        price: 119.90,
        unidades: 18
    },
    {
        nome: "Cabo HDMI 2 metros",
        descricao: "Cabo HDMI de alta velocidade",
        image: "",
        price: 29.90,
        unidades: 40
    },
    {
        nome: "Caixa de Som USB",
        descricao: "Caixa de som estéreo com conexão USB",
        image: "",
        price: 69.90,
        unidades: 14
    }
];

// =================================
// CONTA ADMINISTRADORA
// =================================

const admin = {
    nome: "Administrador",
    email: "admin@eletrostore.com",
    senha: "admin123"
};

// =================================
// INSERÇÃO NO BANCO
// =================================

const criarProdutos = db.prepare(`
    INSERT INTO products
    (nome, descricao, image, price, unidades)
    VALUES
    (@nome, @descricao, @image, @price, @unidades)
`);

const criarAdmin = db.prepare(`
    INSERT OR IGNORE INTO admins
    (nome, email, senha)
    VALUES
    (@nome, @email, @senha)
`);

const popularBanco = db.transaction(() => {

    // Só cadastra os produtos se a tabela estiver vazia
    const totalProdutos = db.prepare(
        "SELECT COUNT(*) AS total FROM products"
    ).get();

    if (totalProdutos.total === 0) {
        for (const produto of produtos) {
            criarProdutos.run(produto);
        }

        console.log("10 produtos cadastrados!");
    } else {
        console.log("Produtos já existem. Nenhum produto foi duplicado.");
    }

    // Cria o admin somente se o e-mail ainda não existir
    criarAdmin.run(admin);

    console.log("Conta de administrador verificada!");
});

try {
    popularBanco();

    console.log("\n==============================");
    console.log(" ELETRO STORE - BANCO PRONTO");
    console.log("==============================");
    console.log("Admin: admin@eletrostore.com");
    console.log("Senha: admin123");
    console.log("==============================\n");

} catch (erro) {
    console.error("Erro ao preparar o banco:", erro.message);
}

db.close();