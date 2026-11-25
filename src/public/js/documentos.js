
const API_DOCUMENTOS = "/api/documents";

const listaDocumentos = document.getElementById("lista-documentos");
const pesquisaDocumento = document.getElementById("pesquisa-documento");
const filtroDocumento = document.getElementById("filtro-documento");

const modalDocumento = document.getElementById("modal-documento");
const conteudoDocumento = document.getElementById("conteudo-documento");
const tituloDocumento = document.getElementById("titulo-documento");

let documentos = [];

// =========================================
// FUNÇÕES AUXILIARES
// =========================================

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarData(data) {
    if (!data) return "Não informada";

    // SQLite costuma retornar: YYYY-MM-DD HH:mm:ss
    const dataCorrigida = String(data).replace(" ", "T");
    const dataFormatada = new Date(dataCorrigida);

    if (isNaN(dataFormatada.getTime())) {
        return String(data);
    }

    return dataFormatada.toLocaleDateString("pt-BR");
}

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

function obterTipo(venda) {
    return venda.sale_type || venda.tipo || "avista";
}

function obterCliente(venda) {
    return venda.customer_name || venda.cliente || "Cliente não informado";
}

function obterDocumento(venda) {
    return venda.customer_document || venda.documento || "Não informado";
}

function obterData(venda) {
    return venda.created_at || venda.data || venda.data_venda;
}

function obterStatus(venda) {
    return String(venda.status || "pendente").toLowerCase();
}

function obterId(venda) {
    return venda.id ?? venda.sale_id;
}

async function requisicao(url) {
    const resposta = await fetch(url);

    const dados = await resposta.json().catch(() => ({}));

    if (resposta.status === 401) {
        window.location.href = "/login";
        throw new Error("Sessão expirada");
    }

    if (!resposta.ok) {
        throw new Error(
            dados.erro || dados.mensagem || "Erro ao consultar documentos."
        );
    }

    return dados;
}

// =========================================
// CARREGAR DOCUMENTOS
// =========================================

async function carregarDocumentos() {
    listaDocumentos.innerHTML = `
        <tr>
            <td colspan="7">Carregando documentos...</td>
        </tr>
    `;

    try {
        const resposta = await requisicao(API_DOCUMENTOS);

        documentos = Array.isArray(resposta)
            ? resposta
            : resposta.vendas || resposta.documents || resposta.data || [];

        atualizarResumo();
        renderizarDocumentos();

    } catch (erro) {
        console.error("Erro ao carregar documentos:", erro);

        listaDocumentos.innerHTML = `
            <tr>
                <td colspan="7">
                    Não foi possível carregar os documentos.
                </td>
            </tr>
        `;
    }
}

// =========================================
// RESUMO
// =========================================

function atualizarResumo() {
    const total = documentos.length;

    const vendasVista = documentos.filter(venda =>
        obterTipo(venda) === "avista"
    ).length;

    const vendasPrazo = documentos.filter(venda =>
        obterTipo(venda) === "prazo"
    ).length;

    document.getElementById("total-documentos").textContent = total;
    document.getElementById("total-vista").textContent = vendasVista;
    document.getElementById("total-prazo").textContent = vendasPrazo;
}

// =========================================
// RENDERIZAR TABELA
// =========================================

function renderizarDocumentos() {
    const pesquisa = pesquisaDocumento.value.toLowerCase().trim();
    const filtro = filtroDocumento.value;

    const filtrados = documentos.filter(venda => {
        const cliente = obterCliente(venda).toLowerCase();
        const id = String(obterId(venda) ?? "");

        const correspondePesquisa =
            cliente.includes(pesquisa) || id.includes(pesquisa);

        const correspondeTipo =
            filtro === "todos" || obterTipo(venda) === filtro;

        return correspondePesquisa && correspondeTipo;
    });

    document.getElementById("contador-documentos").textContent =
        `${filtrados.length} documento(s) encontrado(s)`;

    if (filtrados.length === 0) {
        listaDocumentos.innerHTML = `
            <tr>
                <td colspan="7">Nenhum documento encontrado.</td>
            </tr>
        `;
        return;
    }

    listaDocumentos.innerHTML = filtrados.map(venda => {
        const id = obterId(venda);
        const tipo = obterTipo(venda);
        const status = obterStatus(venda);

        const tipoTexto = tipo === "prazo" ? "A prazo" : "À vista";

        const statusTexto = {
            pago: "Pago",
            pendente: "Pendente",
            parcial: "Parcial"
        }[status] || status;

        const podeTerNota = tipo === "prazo";

        return `
            <tr>
                <td>
                    <span class="document-id">
                        #${escaparHTML(id)}
                    </span>
                </td>

                <td>
                    <span class="document-client">
                        ${escaparHTML(obterCliente(venda))}
                    </span>
                </td>

                <td>
                    <span class="document-type ${escaparHTML(tipo)}">
                        ${tipoTexto}
                    </span>
                </td>

                <td>${formatarData(obterData(venda))}</td>

                <td>${formatarMoeda(venda.total)}</td>

                <td>
                    <span class="document-status ${escaparHTML(status)}">
                        ${escaparHTML(statusTexto)}
                    </span>
                </td>

                <td>
                    <div class="document-actions">
                        <button
                            type="button"
                            data-acao="detalhes"
                            data-id="${escaparHTML(id)}"
                        >
                            Comprovante
                        </button>

                        ${
                            podeTerNota
                            ? `
                                <button
                                    type="button"
                                    data-acao="nota"
                                    data-id="${escaparHTML(id)}"
                                >
                                    Nota promissória
                                </button>
                            `
                            : ""
                        }
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// =========================================
// MODAL
// =========================================

function abrirModal(titulo, conteudo) {
    tituloDocumento.textContent = titulo;
    conteudoDocumento.innerHTML = conteudo;
    modalDocumento.classList.add("active");
}

function fecharModal() {
    modalDocumento.classList.remove("active");
}

// =========================================
// VISUALIZAR COMPROVANTE
// =========================================

async function visualizarComprovante(id) {
    abrirModal("Comprovante de venda", "Carregando comprovante...");

    try {
        const resposta = await requisicao(`${API_DOCUMENTOS}/${id}`);

        const venda = resposta.venda || resposta;

        // A rota documents retorna esses três campos
        const itens = resposta.produtos || resposta.items || resposta.itens || [];
        const pagamentos = resposta.pagamentos || resposta.payments || [];

        let html = `
            <div class="print-document">

                <h3>ELETRO STORE</h3>

                <p><strong>COMPROVANTE DE VENDA</strong></p>

                <p>
                    <strong>Venda:</strong>
                    #${escaparHTML(obterId(venda) ?? id)}
                </p>

                <p>
                    <strong>Cliente:</strong>
                    ${escaparHTML(obterCliente(venda))}
                </p>

                <p>
                    <strong>Documento:</strong>
                    ${escaparHTML(obterDocumento(venda))}
                </p>

                <p>
                    <strong>Data:</strong>
                    ${formatarData(obterData(venda))}
                </p>

                <p>
                    <strong>Tipo:</strong>
                    ${obterTipo(venda) === "prazo" ? "A prazo" : "À vista"}
                </p>

                <h4>Produtos</h4>

                <table>
                    <thead>
                        <tr>
                            <th>Produto</th>
                            <th>Qtd.</th>
                            <th>Preço</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>

                    <tbody>
        `;

        itens.forEach(item => {
            const nome = item.product_name || item.nome || item.produto || "Produto";
            const quantidade = Number(item.quantity ?? item.quantidade ?? 0);
            const preco = Number(item.unit_price ?? item.price ?? item.preco ?? 0);
            const subtotal = Number(item.subtotal ?? quantidade * preco);

            html += `
                <tr>
                    <td>${escaparHTML(nome)}</td>
                    <td>${quantidade}</td>
                    <td>${formatarMoeda(preco)}</td>
                    <td>${formatarMoeda(subtotal)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>

                <h4>Resumo financeiro</h4>

                <p>
                    <strong>Total:</strong>
                    ${formatarMoeda(venda.total)}
                </p>

                <p>
                    <strong>Valor pago:</strong>
                    ${formatarMoeda(venda.paid_amount ?? venda.valor_pago ?? 0)}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${escaparHTML(venda.status || "Não informado")}
                </p>
        `;

        if (pagamentos.length > 0) {
            html += `
                <h4>Pagamentos registrados</h4>

                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Forma</th>
                            <th>Valor</th>
                        </tr>
                    </thead>

                    <tbody>
            `;

            pagamentos.forEach(pagamento => {
                html += `
                    <tr>
                        <td>
                            ${formatarData(pagamento.created_at || pagamento.data)}
                        </td>

                        <td>
                            ${escaparHTML(
                                pagamento.payment_method ||
                                pagamento.forma_pagamento ||
                                pagamento.forma ||
                                "-"
                            )}
                        </td>

                        <td>
                            ${formatarMoeda(
                                pagamento.amount ?? pagamento.valor ?? 0
                            )}
                        </td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;
        }

        html += `
                <p style="margin-top: 30px; text-align: center;">
                    Obrigado pela preferência!
                </p>

            </div>
        `;

        conteudoDocumento.innerHTML = html;

    } catch (erro) {
        console.error("Erro ao carregar comprovante:", erro);

        conteudoDocumento.innerHTML = `
            <p>Não foi possível carregar o comprovante.</p>
            <p>${escaparHTML(erro.message)}</p>
        `;
    }
}

// =========================================
// NOTA PROMISSÓRIA
// =========================================

async function visualizarNotaPromissoria(id) {
    abrirModal("Nota promissória", "Carregando nota promissória...");

    try {
        const resposta = await requisicao(
            `${API_DOCUMENTOS}/${id}/promissory-note`
        );

        // A rota retorna os dados da nota diretamente
        const cliente = resposta.cliente || "Não informado";
        const documento = resposta.documento || "Não informado";
        const valor = Number(resposta.valor_original ?? 0);
        const saldo = Number(resposta.saldo_devedor ?? 0);
        const valorPago = Number(resposta.valor_pago ?? valor - saldo);
        const data = resposta.data_venda;

        conteudoDocumento.innerHTML = `
            <div class="print-document">

                <h3 style="text-align: center;">
                    NOTA PROMISSÓRIA
                </h3>

                <p>
                    <strong>Número:</strong>
                    ${escaparHTML(resposta.venda_id ?? id)}
                </p>

                <p>
                    <strong>Data de emissão:</strong>
                    ${formatarData(data)}
                </p>

                <p>
                    <strong>Valor original:</strong>
                    ${formatarMoeda(valor)}
                </p>

                <p>
                    <strong>Valor já pago:</strong>
                    ${formatarMoeda(valorPago)}
                </p>

                <p>
                    <strong>Saldo devedor:</strong>
                    ${formatarMoeda(saldo)}
                </p>

                <p style="margin-top: 30px;">
                    Eu, <strong>${escaparHTML(cliente)}</strong>,
                    documento <strong>${escaparHTML(documento)}</strong>,
                    reconheço dever à Eletro Store a quantia de
                    <strong>${formatarMoeda(saldo)}</strong>,
                    referente à venda de número
                    <strong>#${escaparHTML(resposta.venda_id ?? id)}</strong>.
                </p>

                <p style="margin-top: 40px;">
                    Local e data:
                    ______________________________________
                </p>

                <p style="margin-top: 55px; text-align: center;">
                    ______________________________________
                    <br>
                    Assinatura do responsável pelo pagamento
                </p>

            </div>
        `;

    } catch (erro) {
        console.error("Erro ao carregar nota promissória:", erro);

        conteudoDocumento.innerHTML = `
            <p>Não foi possível carregar a nota promissória.</p>
            <p>${escaparHTML(erro.message)}</p>
        `;
    }
}

// =========================================
// EVENTOS
// =========================================

listaDocumentos.addEventListener("click", event => {
    const botao = event.target.closest("button[data-acao]");

    if (!botao) return;

    const id = botao.dataset.id;

    if (botao.dataset.acao === "detalhes") {
        visualizarComprovante(id);
    }

    if (botao.dataset.acao === "nota") {
        visualizarNotaPromissoria(id);
    }
});

pesquisaDocumento.addEventListener("input", renderizarDocumentos);
filtroDocumento.addEventListener("change", renderizarDocumentos);

document.getElementById("btn-atualizar")
    .addEventListener("click", carregarDocumentos);

document.getElementById("btn-fechar-modal")
    .addEventListener("click", fecharModal);

document.getElementById("btn-fechar-documento")
    .addEventListener("click", fecharModal);

document.getElementById("btn-imprimir")
    .addEventListener("click", () => {
        window.print();
    });

modalDocumento.addEventListener("click", event => {
    if (event.target === modalDocumento) {
        fecharModal();
    }
});

// =========================================
// INICIALIZAÇÃO
// =========================================

carregarDocumentos();
