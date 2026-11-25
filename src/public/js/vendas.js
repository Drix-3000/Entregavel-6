
const API_PRODUTOS = "/api/products";
const API_VENDAS = "/api/sales";

const listaProdutos = document.getElementById("lista-produtos-venda");
const listaCarrinho = document.getElementById("lista-carrinho");
const listaVendas = document.getElementById("lista-vendas");

const pesquisa = document.getElementById("pesquisa-produto-venda");
const tipoVenda = document.getElementById("tipo-venda");

let produtos = [];
let carrinho = [];

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

function formatarPreco(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarData(data) {
    if (!data) return "—";

    const dataObj = new Date(data);

    if (Number.isNaN(dataObj.getTime())) {
        return String(data);
    }

    return dataObj.toLocaleString("pt-BR");
}

async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(url, {
        ...opcoes,
        headers: {
            ...(opcoes.body ? { "Content-Type": "application/json" } : {}),
            ...opcoes.headers
        }
    });

    if (resposta.status === 401) {
        window.location.href = "/login";
        throw new Error("Sessão expirada.");
    }

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(dados.erro || dados.mensagem || "Não foi possível realizar a operação.");
    }

    return dados;
}

// PRODUTOS DISPONÍVEIS
async function carregarProdutos() {
    listaProdutos.innerHTML = `<p class="table-loading">Carregando produtos...</p>`;

    try {
        const dados = await requisicao(API_PRODUTOS);
        produtos = Array.isArray(dados) ? dados : dados.produtos || [];

        renderizarProdutos();
    } catch (erro) {
        listaProdutos.innerHTML = `
            <p class="table-error">${escaparHTML(erro.message)}</p>
        `;
    }
}

function renderizarProdutos() {
    const termo = pesquisa.value.trim().toLowerCase();

    const filtrados = produtos.filter(produto => {
        const nome = String(produto.nome || "").toLowerCase();
        const descricao = String(produto.descricao || "").toLowerCase();

        return nome.includes(termo) || descricao.includes(termo);
    });

    if (filtrados.length === 0) {
        listaProdutos.innerHTML = `
            <p class="table-empty">Nenhum produto encontrado.</p>
        `;
        return;
    }

    listaProdutos.innerHTML = filtrados.map(produto => {
        const quantidade = Number(produto.unidades || 0);
        const nome = escaparHTML(produto.nome);

        const imagem = produto.image
            ? `<img class="sale-product-image"
                    src="${escaparHTML(produto.image)}"
                    alt="${nome}"
                    onerror="this.style.display='none'">`
            : `<div class="sale-product-placeholder"><img src="./assets/inventory_2_24dp.svg" alt=""></div>`;

        return `
            <article class="sale-product">
                <div class="sale-product-top">
                    ${imagem}

                    <div class="sale-product-info">
                        <strong>${nome}</strong>
                        <small>Estoque: ${quantidade} unidade(s)</small>
                    </div>
                </div>

                <div class="sale-product-bottom">
                    <div>
                        <span class="sale-product-price">
                            ${formatarPreco(produto.price)}
                        </span>
                        <small class="sale-product-stock">
                            ${quantidade > 0 ? "Disponível" : "Sem estoque"}
                        </small>
                    </div>

                    <button
                        class="btn-add-product"
                        data-adicionar="${produto.id}"
                        ${quantidade <= 0 ? "disabled" : ""}
                    >
                        + Adicionar
                    </button>
                </div>
            </article>
        `;
    }).join("");
}

// CARRINHO
function adicionarAoCarrinho(id) {
    const produto = produtos.find(item => String(item.id) === String(id));

    if (!produto) return;

    const existente = carrinho.find(
        item => String(item.product_id) === String(id)
    );

    const quantidadeAtual = existente ? existente.quantidade : 0;
    const estoque = Number(produto.unidades || 0);

    if (quantidadeAtual >= estoque) {
        mostrarMensagem("A quantidade solicitada ultrapassa o estoque disponível.", "error");
        return;
    }

    if (existente) {
        existente.quantidade++;
    } else {
        carrinho.push({
            product_id: produto.id,
            nome: produto.nome,
            price: Number(produto.price || 0),
            quantidade: 1,
            estoque
        });
    }

    limparMensagem();
    renderizarCarrinho();
}

function alterarQuantidade(id, alteracao) {
    const item = carrinho.find(
        produto => String(produto.product_id) === String(id)
    );

    if (!item) return;

    const novaQuantidade = item.quantidade + alteracao;

    if (novaQuantidade <= 0) {
        removerDoCarrinho(id);
        return;
    }

    if (novaQuantidade > item.estoque) {
        mostrarMensagem(
            `Estoque insuficiente para ${item.nome}. Disponível: ${item.estoque}.`,
            "error"
        );
        return;
    }

    item.quantidade = novaQuantidade;
    limparMensagem();
    renderizarCarrinho();
}

function removerDoCarrinho(id) {
    carrinho = carrinho.filter(
        item => String(item.product_id) !== String(id)
    );

    renderizarCarrinho();
}

function calcularTotal() {
    return carrinho.reduce(
        (total, item) => total + item.price * item.quantidade,
        0
    );
}

function renderizarCarrinho() {
    if (carrinho.length === 0) {
        listaCarrinho.innerHTML = `
            <div class="cart-empty">
                <span><img src="./assets/shopping_cart_24dp_000000.svg" alt="cart"></span>
                <p>Seu carrinho está vazio.</p>
                <small>Selecione produtos para começar.</small>
            </div>
        `;
    } else {
        listaCarrinho.innerHTML = carrinho.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <strong>${escaparHTML(item.nome)}</strong>
                    <small>${formatarPreco(item.price)} por unidade</small>

                    <div class="cart-item-controls">
                        <button class="cart-quantity-btn"
                            data-diminuir="${item.product_id}">−</button>

                        <span class="cart-quantity">${item.quantidade}</span>

                        <button class="cart-quantity-btn"
                            data-aumentar="${item.product_id}">+</button>
                    </div>
                </div>

                <div>
                    <div class="cart-item-total">
                        ${formatarPreco(item.price * item.quantidade)}
                    </div>

                    <button class="cart-remove"
                        data-remover="${item.product_id}">
                        Remover
                    </button>
                </div>
            </div>
        `).join("");
    }

    const totalItens = carrinho.reduce(
        (total, item) => total + item.quantidade,
        0
    );

    document.getElementById("quantidade-itens").textContent =
        `${totalItens} ${totalItens === 1 ? "item" : "itens"}`;

    document.getElementById("total-venda").textContent =
        formatarPreco(calcularTotal());
}

// MENSAGENS
function mostrarMensagem(texto, tipo) {
    const mensagem = document.getElementById("mensagem-venda");

    mensagem.textContent = texto;
    mensagem.className = `form-message ${tipo}`;
}

function limparMensagem() {
    const mensagem = document.getElementById("mensagem-venda");

    mensagem.textContent = "";
    mensagem.className = "form-message";
}

// TIPO DE VENDA
function atualizarAvisoPrazo() {
    const aviso = document.getElementById("aviso-prazo");

    aviso.classList.toggle("active", tipoVenda.value === "prazo");
}

tipoVenda.addEventListener("change", atualizarAvisoPrazo);

// FINALIZAR VENDA
async function finalizarVenda() {
    if (carrinho.length === 0) {
        mostrarMensagem("Adicione pelo menos um produto ao carrinho.", "error");
        return;
    }

    const cliente = document.getElementById("cliente-nome").value.trim();
    const documento = document.getElementById("cliente-documento").value.trim();
    const tipo = tipoVenda.value;

    if (tipo === "prazo" && !cliente) {
        mostrarMensagem("Informe o nome do cliente para uma venda a prazo.", "error");
        document.getElementById("cliente-nome").focus();
        return;
    }

    const itens = carrinho.map(item => ({
        product_id: item.product_id,
        quantidade: item.quantidade
    }));

    const botao = document.getElementById("btn-finalizar-venda");

    botao.disabled = true;
    botao.textContent = "Registrando venda...";

    try {
        const resultado = await requisicao(API_VENDAS, {
            method: "POST",
            body: JSON.stringify({
                cliente,
                documento,
                tipo,
                items: itens
            })
        });

        carrinho = [];
        renderizarCarrinho();

        document.getElementById("cliente-nome").value = "";
        document.getElementById("cliente-documento").value = "";
        tipoVenda.value = "avista";
        atualizarAvisoPrazo();

        mostrarMensagem(
            resultado.mensagem || "Venda registrada com sucesso!",
            "success"
        );

        await Promise.all([
            carregarProdutos(),
            carregarVendas()
        ]);

    } catch (erro) {
        mostrarMensagem(erro.message, "error");
    } finally {
        botao.disabled = false;
        botao.textContent = "Finalizar venda";
    }
}

// HISTÓRICO DE VENDAS
async function carregarVendas() {
    listaVendas.innerHTML = `
        <tr>
            <td colspan="6" class="table-loading">Carregando vendas...</td>
        </tr>
    `;

    try {
        const dados = await requisicao(API_VENDAS);
        const vendas = Array.isArray(dados) ? dados : dados.vendas || [];

        renderizarVendas(vendas);

    } catch (erro) {
        listaVendas.innerHTML = `
            <tr>
                <td colspan="6" class="table-error">
                    ${escaparHTML(erro.message)}
                </td>
            </tr>
        `;
    }
}

function renderizarVendas(vendas) {
    if (vendas.length === 0) {
        listaVendas.innerHTML = `
            <tr>
                <td colspan="6" class="table-empty">
                    Nenhuma venda registrada.
                </td>
            </tr>
        `;
    } else {
        listaVendas.innerHTML = vendas.slice(0, 10).map(venda => {
            const tipo = venda.sale_type || venda.tipo || "";
            const avista = tipo === "avista";

            const status = String(venda.status || "").toLowerCase();
            const pago = status === "pago";
            const pendente = status === "pendente";

            const classeStatus = pago ? "paid" : pendente ? "pending" : "other";
            const textoStatus = pago ? "Pago" : pendente ? "Pendente" : (venda.status || "—");

            return `
                <tr>
                    <td>#${escaparHTML(venda.id)}</td>
                    <td>${escaparHTML(venda.customer_name || venda.cliente || "Consumidor")}</td>
                    <td>${escaparHTML(formatarData(venda.created_at || venda.data))}</td>
                    <td>
                        <span class="sale-type ${avista ? "cash" : "credit"}">
                            ${avista ? "À vista" : "A prazo"}
                        </span>
                    </td>
                    <td><strong>${formatarPreco(venda.total)}</strong></td>
                    <td>
                        <span class="sale-status ${classeStatus}">
                            ${escaparHTML(textoStatus)}
                        </span>
                    </td>
                </tr>
            `;
        }).join("");
    }

    document.getElementById("contador-vendas").textContent =
        `${vendas.length} venda(s) encontrada(s)`;
}

// EVENTOS
listaProdutos.addEventListener("click", event => {
    const botao = event.target.closest("[data-adicionar]");
    if (!botao) return;

    adicionarAoCarrinho(botao.dataset.adicionar);
});

listaCarrinho.addEventListener("click", event => {
    const aumentar = event.target.closest("[data-aumentar]");
    const diminuir = event.target.closest("[data-diminuir]");
    const remover = event.target.closest("[data-remover]");

    if (aumentar) {
        alterarQuantidade(aumentar.dataset.aumentar, 1);
    }

    if (diminuir) {
        alterarQuantidade(diminuir.dataset.diminuir, -1);
    }

    if (remover) {
        removerDoCarrinho(remover.dataset.remover);
    }
});

pesquisa.addEventListener("input", renderizarProdutos);

document.getElementById("btn-finalizar-venda")
    .addEventListener("click", finalizarVenda);

document.getElementById("btn-atualizar-vendas")
    .addEventListener("click", () => {
        carregarProdutos();
        carregarVendas();
    });

// INICIALIZAÇÃO
renderizarCarrinho();
atualizarAvisoPrazo();

Promise.all([
    carregarProdutos(),
    carregarVendas()
]);
