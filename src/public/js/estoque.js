
const API_PRODUTOS = "/api/products";
const API_ESTOQUE = "/api/stock";

const listaEstoque = document.getElementById("lista-estoque");
const pesquisa = document.getElementById("pesquisa-estoque");
const filtro = document.getElementById("filtro-estoque");

const modalMovimentacao = document.getElementById("modal-movimentacao");
const modalHistorico = document.getElementById("modal-historico");
const formulario = document.getElementById("form-movimentacao");

let produtos = [];

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
    if (!data) return "Data não informada";

    const dataObj = new Date(data);

    if (Number.isNaN(dataObj.getTime())) {
        return String(data);
    }

    return dataObj.toLocaleString("pt-BR");
}

function obterStatus(quantidade) {
    if (quantidade <= 0) {
        return {
            texto: "Esgotado",
            classe: "out",
            tipo: "esgotado"
        };
    }

    if (quantidade <= 5) {
        return {
            texto: "Estoque baixo",
            classe: "low",
            tipo: "baixo"
        };
    }

    return {
        texto: "Disponível",
        classe: "available",
        tipo: "disponivel"
    };
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

async function carregarEstoque() {
    listaEstoque.innerHTML = `
        <tr>
            <td colspan="5" class="table-loading">Carregando estoque...</td>
        </tr>
    `;

    try {
        const dados = await requisicao(API_PRODUTOS);
        produtos = Array.isArray(dados) ? dados : dados.produtos || [];

        renderizarEstoque();
        atualizarIndicadores();
    } catch (erro) {
        listaEstoque.innerHTML = `
            <tr>
                <td colspan="5" class="table-error">
                    ${escaparHTML(erro.message)}
                </td>
            </tr>
        `;
    }
}

function atualizarIndicadores() {
    const totalProdutos = produtos.length;

    const totalUnidades = produtos.reduce(
        (total, produto) => total + Number(produto.unidades || 0),
        0
    );

    const baixo = produtos.filter(produto => {
        const quantidade = Number(produto.unidades || 0);
        return quantidade > 0 && quantidade <= 5;
    }).length;

    const esgotados = produtos.filter(
        produto => Number(produto.unidades || 0) <= 0
    ).length;

    document.getElementById("total-produtos").textContent = totalProdutos;
    document.getElementById("total-unidades").textContent = totalUnidades;
    document.getElementById("estoque-baixo").textContent = baixo;
    document.getElementById("produtos-esgotados").textContent = esgotados;
}

function obterProdutosFiltrados() {
    const termo = pesquisa.value.trim().toLowerCase();
    const statusFiltro = filtro.value;

    return produtos.filter(produto => {
        const nome = String(produto.nome || "").toLowerCase();
        const descricao = String(produto.descricao || "").toLowerCase();
        const quantidade = Number(produto.unidades || 0);
        const status = obterStatus(quantidade).tipo;

        const correspondePesquisa =
            nome.includes(termo) || descricao.includes(termo);

        const correspondeStatus =
            statusFiltro === "todos" || status === statusFiltro;

        return correspondePesquisa && correspondeStatus;
    });
}

function renderizarEstoque() {
    const filtrados = obterProdutosFiltrados();

    if (filtrados.length === 0) {
        listaEstoque.innerHTML = `
            <tr>
                <td colspan="5" class="table-empty">
                    Nenhum produto encontrado.
                </td>
            </tr>
        `;
    } else {
        listaEstoque.innerHTML = filtrados.map(produto => {
            const quantidade = Number(produto.unidades || 0);
            const status = obterStatus(quantidade);
            const nome = escaparHTML(produto.nome);
            const imagem = produto.image
                ? `<img class="stock-product-image"
                        src="${escaparHTML(produto.image)}"
                        alt="${nome}"
                        onerror="this.style.display='none'">`
                : `<div class="stock-product-placeholder"><img src="./assets/inventory_2_24dp.svg" alt=""></div>`;

            return `
                <tr>
                    <td>
                        <div class="stock-product">
                            ${imagem}
                            <div>
                                <strong>${nome}</strong>
                                <small>${escaparHTML(produto.descricao || "Sem descrição")}</small>
                            </div>
                        </div>
                    </td>

                    <td>${formatarPreco(produto.price)}</td>

                    <td>
                        <span class="stock-quantity">${quantidade}</span>
                        <small> un.</small>
                    </td>

                    <td>
                        <span class="stock-status ${status.classe}">
                            ${status.texto}
                        </span>
                    </td>

                    <td>
                        <div class="stock-actions">
                            <button class="stock-action entry"
                                data-acao="entrada" data-id="${produto.id}">
                                + Entrada
                            </button>

                            <button class="stock-action exit"
                                data-acao="saida" data-id="${produto.id}">
                                − Saída
                            </button>

                            <button class="stock-action history"
                                data-acao="historico" data-id="${produto.id}">
                                Histórico
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    document.getElementById("contador-estoque").textContent =
        `${filtrados.length} produto(s) encontrado(s)`;
}

function abrirModalMovimentacao(produto, tipo) {
    formulario.reset();

    document.getElementById("movimento-produto-id").value = produto.id;
    document.getElementById("tipo-movimentacao").value = tipo;
    document.getElementById("nome-produto-modal").textContent = produto.nome;

    document.getElementById("titulo-modal").textContent =
        tipo === "entrada" ? "Registrar entrada" : "Registrar saída";

    document.getElementById("btn-salvar-movimentacao").textContent =
        tipo === "entrada" ? "Registrar entrada" : "Registrar saída";

    document.getElementById("mensagem-movimentacao").className = "form-message";
    document.getElementById("mensagem-movimentacao").textContent = "";

    modalMovimentacao.classList.add("active");
}

function fecharModalMovimentacao() {
    modalMovimentacao.classList.remove("active");
}

async function abrirHistorico(produto) {
    document.getElementById("nome-produto-historico").textContent = produto.nome;

    const conteudo = document.getElementById("lista-historico");
    conteudo.innerHTML = `<p class="table-loading">Carregando histórico...</p>`;

    modalHistorico.classList.add("active");

    try {
        const dados = await requisicao(
            `${API_ESTOQUE}/${produto.id}/movements`
        );

        const movimentacoes = Array.isArray(dados)
            ? dados
            : dados.movimentacoes || dados.movements || [];

        if (movimentacoes.length === 0) {
            conteudo.innerHTML = `
                <p class="table-empty">Nenhuma movimentação registrada.</p>
            `;
            return;
        }

        conteudo.innerHTML = movimentacoes.map(movimento => {
            const tipo = String(movimento.tipo || movimento.tipo_movimento || "").toLowerCase();
            const entrada = tipo.includes("entrada");
            const quantidade = Number(movimento.quantidade || 0);

            return `
                <div class="history-item">
                    <div>
                        <strong>${entrada ? "Entrada de mercadoria" : "Saída de mercadoria"}</strong>
                        <small>${escaparHTML(formatarData(
                            movimento.data || movimento.created_at || movimento.data_movimentacao
                        ))}</small>
                    </div>

                    <span class="history-quantity ${entrada ? "entry" : "exit"}">
                        ${entrada ? "+" : "-"}${quantidade} un.
                    </span>
                </div>
            `;
        }).join("");

    } catch (erro) {
        conteudo.innerHTML = `
            <p class="table-error">${escaparHTML(erro.message)}</p>
        `;
    }
}

// AÇÕES DA TABELA
listaEstoque.addEventListener("click", event => {
    const botao = event.target.closest("button[data-acao]");
    if (!botao) return;

    const produto = produtos.find(
        item => String(item.id) === botao.dataset.id
    );

    if (!produto) return;

    if (botao.dataset.acao === "entrada") {
        abrirModalMovimentacao(produto, "entrada");
    }

    if (botao.dataset.acao === "saida") {
        abrirModalMovimentacao(produto, "saida");
    }

    if (botao.dataset.acao === "historico") {
        abrirHistorico(produto);
    }
});

// REGISTRAR ENTRADA OU SAÍDA
formulario.addEventListener("submit", async event => {
    event.preventDefault();

    const id = document.getElementById("movimento-produto-id").value;
    const tipo = document.getElementById("tipo-movimentacao").value;
    const quantidade = Number(
        document.getElementById("quantidade-movimentacao").value
    );

    const mensagem = document.getElementById("mensagem-movimentacao");
    const botao = document.getElementById("btn-salvar-movimentacao");

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
        mensagem.textContent = "Informe uma quantidade inteira maior que zero.";
        mensagem.className = "form-message error";
        return;
    }

    const produto = produtos.find(item => String(item.id) === id);

    if (!produto) return;

    if (
        tipo === "saida" &&
        quantidade > Number(produto.unidades || 0)
    ) {
        mensagem.textContent = "A quantidade de saída é maior que o estoque disponível.";
        mensagem.className = "form-message error";
        return;
    }

    botao.disabled = true;
    botao.textContent = "Registrando...";

    const endpoint = tipo === "entrada" ? "entry" : "exit";

    try {
        await requisicao(`${API_ESTOQUE}/${id}/${endpoint}`, {
            method: "POST",
            body: JSON.stringify({ quantidade })
        });

        fecharModalMovimentacao();
        await carregarEstoque();

    } catch (erro) {
        mensagem.textContent = erro.message;
        mensagem.className = "form-message error";
    } finally {
        botao.disabled = false;
        botao.textContent = tipo === "entrada"
            ? "Registrar entrada"
            : "Registrar saída";
    }
});

// FILTROS E BOTÕES
pesquisa.addEventListener("input", renderizarEstoque);
filtro.addEventListener("change", renderizarEstoque);

document.getElementById("btn-atualizar").addEventListener("click", carregarEstoque);

document.getElementById("btn-fechar-modal").addEventListener(
    "click",
    fecharModalMovimentacao
);

document.getElementById("btn-cancelar").addEventListener(
    "click",
    fecharModalMovimentacao
);

document.getElementById("btn-fechar-historico").addEventListener(
    "click",
    () => modalHistorico.classList.remove("active")
);

modalMovimentacao.addEventListener("click", event => {
    if (event.target === modalMovimentacao) {
        fecharModalMovimentacao();
    }
});

modalHistorico.addEventListener("click", event => {
    if (event.target === modalHistorico) {
        modalHistorico.classList.remove("active");
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        fecharModalMovimentacao();
        modalHistorico.classList.remove("active");
    }
});

// INICIALIZAÇÃO
carregarEstoque();
