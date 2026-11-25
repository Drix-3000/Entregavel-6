
const API = "/api/products";

// =====================================
// ELEMENTOS HTML
// =====================================

const tabela = document.getElementById("lista-produtos");

const botaoNovo = document.getElementById("btn-novo-produto");

const modal = document.getElementById("modal-produto");

const formulario = document.getElementById("form-produto");

const pesquisa = document.getElementById("pesquisa-produto");

const filtroStatus = document.getElementById("filtro-status");

const ordenacao = document.getElementById("ordenacao-produtos");

const contador = document.getElementById("contador-produtos");

const mensagem = document.getElementById("mensagem-form");

const botaoSalvar = document.getElementById("btn-salvar");

// =====================================
// CAMPOS DO FORMULÁRIO
// =====================================

const campoId = document.getElementById("produto-id");
const campoNome = document.getElementById("produto-nome");
const campoDescricao = document.getElementById("produto-descricao");
const campoImagem = document.getElementById("produto-imagem");
const campoPreco = document.getElementById("produto-preco");
const campoQuantidade = document.getElementById("produto-quantidade");

// =====================================
// VARIÁVEIS
// =====================================

let produtos = [];

// =====================================
// FUNÇÕES AUXILIARES
// =====================================

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => {
        const entidades = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entidades[caractere];
    });
}

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function obterImagemSegura(url) {
    try {
        const imagem = new URL(url);

        if (imagem.protocol === "https:" || imagem.protocol === "http:") {
            return escaparHTML(imagem.href);
        }
    } catch (erro) {
        // URL inválida
    }

    return "";
}

function obterStatus(quantidade) {
    if (quantidade === 0) {
        return {
            texto: "Esgotado",
            classe: "status-out"
        };
    }

    if (quantidade <= 5) {
        return {
            texto: "Estoque baixo",
            classe: "status-low"
        };
    }

    return {
        texto: "Disponível",
        classe: "status-available"
    };
}

// =====================================
// REQUISIÇÕES À API
// =====================================

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
        throw new Error(dados.erro || dados.mensagem || "Erro na operação.");
    }

    return dados;
}

// =====================================
// CARREGAR PRODUTOS
// =====================================

async function carregarProdutos() {
    tabela.innerHTML = `
        <tr>
            <td colspan="6" class="table-loading">
                Carregando produtos...
            </td>
        </tr>
    `;

    try {
        produtos = await requisicao(API);

        if (!Array.isArray(produtos)) {
            throw new Error("Resposta inválida da API.");
        }

        renderizarProdutos();

    } catch (erro) {
        console.error("Erro ao carregar produtos:", erro);

        tabela.innerHTML = `
            <tr>
                <td colspan="6" class="table-error">
                    Não foi possível carregar os produtos.
                    <br>
                    ${escaparHTML(erro.message)}
                </td>
            </tr>
        `;

        contador.textContent = "Erro ao carregar produtos";
    }
}

// =====================================
// FILTRAR E ORDENAR
// =====================================

function obterProdutosFiltrados() {
    let resultado = [...produtos];

    const termo = pesquisa.value.trim().toLowerCase();

    const statusSelecionado = filtroStatus.value;

    // Pesquisa por nome ou descrição
    if (termo) {
        resultado = resultado.filter(produto => {
            return (
                String(produto.nome || "").toLowerCase().includes(termo) ||
                String(produto.descricao || "").toLowerCase().includes(termo)
            );
        });
    }

    // Filtro por estoque
    resultado = resultado.filter(produto => {
        const quantidade = Number(produto.unidades);

        if (statusSelecionado === "disponivel") {
            return quantidade > 5;
        }

        if (statusSelecionado === "baixo") {
            return quantidade > 0 && quantidade <= 5;
        }

        if (statusSelecionado === "esgotado") {
            return quantidade === 0;
        }

        return true;
    });

    // Ordenação
    switch (ordenacao.value) {
        case "nome":
            resultado.sort((a, b) =>
                a.nome.localeCompare(b.nome, "pt-BR")
            );
            break;

        case "preco-menor":
            resultado.sort((a, b) => Number(a.price) - Number(b.price));
            break;

        case "preco-maior":
            resultado.sort((a, b) => Number(b.price) - Number(a.price));
            break;

        case "estoque":
            resultado.sort((a, b) => Number(b.unidades) - Number(a.unidades));
            break;

        case "recentes":
        default:
            resultado.sort((a, b) => Number(b.id) - Number(a.id));
            break;
    }

    return resultado;
}

// =====================================
// RENDERIZAR TABELA
// =====================================

function renderizarProdutos() {
    const lista = obterProdutosFiltrados();

    contador.textContent =
        `${lista.length} ${lista.length === 1 ? "produto encontrado" : "produtos encontrados"}`;

    if (lista.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td colspan="6" class="table-empty">
                    Nenhum produto encontrado.
                </td>
            </tr>
        `;

        return;
    }

    tabela.innerHTML = lista.map(produto => {
        const status = obterStatus(Number(produto.unidades));

        const imagem = obterImagemSegura(produto.image);

        return `
            <tr>
                <td>
                    <div class="product-info">

                        ${
                            imagem
                                ? `
                                    <img
                                        src="${imagem}"
                                        alt="${escaparHTML(produto.nome)}"
                                        class="product-image"
                                        onerror="this.outerHTML='<div class=&quot;product-image-placeholder&quot;>📦</div>'"
                                    >
                                `
                                : `
                                    <div class="product-image-placeholder">
                                        📦
                                    </div>
                                `
                        }

                        <span class="product-name">
                            ${escaparHTML(produto.nome)}
                        </span>

                    </div>
                </td>

                <td>
                    <span class="product-description">
                        ${escaparHTML(produto.descricao || "Sem descrição")}
                    </span>
                </td>

                <td>
                    <span class="product-price">
                        ${formatarPreco(produto.price)}
                    </span>
                </td>

                <td>
                    <span class="product-quantity">
                        ${Number(produto.unidades)}
                    </span>
                </td>

                <td>
                    <span class="product-status ${status.classe}">
                        ${status.texto}
                    </span>
                </td>

                <td>
                    <div class="product-actions">

                        <button
                            type="button"
                            class="btn-edit"
                            data-action="editar"
                            data-id="${Number(produto.id)}"
                        >
                            Editar
                        </button>

                        <button
                            type="button"
                            class="btn-delete"
                            data-action="excluir"
                            data-id="${Number(produto.id)}"
                        >
                            Excluir
                        </button>

                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// =====================================
// ABRIR MODAL
// =====================================

function abrirModal(produto = null) {
    formulario.reset();

    mensagem.textContent = "";
    mensagem.className = "form-message";

    if (produto) {
        document.getElementById("modal-titulo").textContent = "Editar produto";

        campoId.value = produto.id;
        campoNome.value = produto.nome;
        campoDescricao.value = produto.descricao || "";
        campoImagem.value = produto.image || "";
        campoPreco.value = produto.price;
        campoQuantidade.value = produto.unidades;

        botaoSalvar.textContent = "Salvar alterações";

    } else {
        document.getElementById("modal-titulo").textContent = "Novo produto";

        campoId.value = "";
        botaoSalvar.textContent = "Salvar produto";
    }

    modal.classList.add("active");
}

function fecharModal() {
    modal.classList.remove("active");
    formulario.reset();

    mensagem.textContent = "";
    mensagem.className = "form-message";
}

// =====================================
// CADASTRAR / EDITAR PRODUTO
// =====================================

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const id = campoId.value;

    const dados = {
        nome: campoNome.value.trim(),
        descricao: campoDescricao.value.trim(),
        image: campoImagem.value.trim(),
        price: Number(campoPreco.value),
        unidades: Number(campoQuantidade.value)
    };

    if (!dados.nome) {
        mostrarMensagem("Informe o nome do produto.", "error");
        return;
    }

    if (!Number.isFinite(dados.price) || dados.price < 0) {
        mostrarMensagem("Informe um preço válido.", "error");
        return;
    }

    if (!Number.isInteger(dados.unidades) || dados.unidades < 0) {
        mostrarMensagem("Informe uma quantidade inteira válida.", "error");
        return;
    }

    botaoSalvar.disabled = true;
    botaoSalvar.textContent = "Salvando...";

    try {
        const url = id ? `${API}/${id}` : API;

        const metodo = id ? "PUT" : "POST";

        await requisicao(url, {
            method: metodo,
            body: JSON.stringify(dados)
        });

        fecharModal();

        await carregarProdutos();

    } catch (erro) {
        console.error("Erro ao salvar produto:", erro);

        mostrarMensagem(erro.message, "error");

    } finally {
        botaoSalvar.disabled = false;

        botaoSalvar.textContent = campoId.value
            ? "Salvar alterações"
            : "Salvar produto";
    }
});

// =====================================
// MENSAGENS DO FORMULÁRIO
// =====================================

function mostrarMensagem(texto, tipo) {
    mensagem.textContent = texto;
    mensagem.className = `form-message ${tipo}`;
}

// =====================================
// EDITAR / EXCLUIR
// =====================================

tabela.addEventListener("click", async (evento) => {
    const botao = evento.target.closest("button[data-action]");

    if (!botao) return;

    const id = Number(botao.dataset.id);

    const produto = produtos.find(item => Number(item.id) === id);

    if (!produto) return;

    // EDITAR
    if (botao.dataset.action === "editar") {
        abrirModal(produto);
        return;
    }

    // EXCLUIR
    if (botao.dataset.action === "excluir") {
        const confirmar = confirm(
            `Deseja realmente excluir o produto "${produto.nome}"?`
        );

        if (!confirmar) return;

        try {
            await requisicao(`${API}/${id}`, {
                method: "DELETE"
            });

            await carregarProdutos();

        } catch (erro) {
            alert(erro.message);
            console.error("Erro ao excluir produto:", erro);
        }
    }
});

// =====================================
// EVENTOS DO MODAL
// =====================================

botaoNovo.addEventListener("click", () => {
    abrirModal();
});

document.getElementById("btn-fechar-modal")
    .addEventListener("click", fecharModal);

document.getElementById("btn-cancelar")
    .addEventListener("click", fecharModal);

// Fechar clicando fora do modal
modal.addEventListener("click", (evento) => {
    if (evento.target === modal) {
        fecharModal();
    }
});

// Fechar com ESC
document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && modal.classList.contains("active")) {
        fecharModal();
    }
});

// =====================================
// EVENTOS DOS FILTROS
// =====================================

pesquisa.addEventListener("input", renderizarProdutos);

filtroStatus.addEventListener("change", renderizarProdutos);

ordenacao.addEventListener("change", renderizarProdutos);

// =====================================
// INICIALIZAÇÃO
// =====================================

carregarProdutos();