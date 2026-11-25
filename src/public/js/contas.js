
const API_PAGAMENTOS = "/api/payments";

const listaContas = document.getElementById("lista-contas");
const listaPagamentos = document.getElementById("lista-pagamentos");

const pesquisaConta = document.getElementById("pesquisa-conta");
const filtroStatus = document.getElementById("filtro-status");

const modalPagamento = document.getElementById("modal-pagamento");
const formPagamento = document.getElementById("form-pagamento");

let contas = [];
let contaSelecionada = null;

function moeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function dataBR(data) {
    if (!data) return "-";

    const dataFormatada = new Date(data);

    if (isNaN(dataFormatada.getTime())) return data;

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

async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(url, {
        ...opcoes,
        headers: {
            "Content-Type": "application/json",
            ...(opcoes.headers || {})
        }
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(
            dados.erro || dados.mensagem || "Não foi possível realizar a operação."
        );
    }

    return dados;
}

function obterId(conta) {
    return conta.sale_id ?? conta.id;
}

function obterCliente(conta) {
    return conta.cliente || conta.customer_name || "Cliente não informado";
}

function obterTotal(conta) {
    return Number(conta.total || 0);
}

function obterPago(conta) {
    return Number(conta.paid_amount ?? conta.valor_pago ?? 0);
}

function obterSaldo(conta) {
    return Number(
        conta.balance ??
        conta.saldo ??
        Math.max(0, obterTotal(conta) - obterPago(conta))
    );
}

function obterStatus(conta) {
    const saldo = obterSaldo(conta);

    if (saldo <= 0) return "pago";
    if (obterPago(conta) > 0) return "parcial";

    return "pendente";
}

// CARREGAR CONTAS

async function carregarContas() {
    listaContas.innerHTML = `
        <tr><td colspan="8">Carregando contas...</td></tr>
    `;

    listaPagamentos.innerHTML = `
        <tr><td colspan="5">Carregando pagamentos...</td></tr>
    `;

    try {
        const resposta = await requisicao(API_PAGAMENTOS);

        contas = Array.isArray(resposta)
            ? resposta
            : resposta.contas || resposta.sales || resposta.data || [];

        atualizarResumo();
        renderizarContas();
        await renderizarPagamentos();

    } catch (erro) {
        console.error(erro);

        listaContas.innerHTML = `
            <tr><td colspan="8">Erro ao carregar contas.</td></tr>
        `;

        listaPagamentos.innerHTML = `
            <tr><td colspan="5">Erro ao carregar pagamentos.</td></tr>
        `;
    }
}

// RESUMO

function atualizarResumo() {
    const totalVendido = contas.reduce(
        (soma, conta) => soma + obterTotal(conta),
        0
    );

    const totalRecebido = contas.reduce(
        (soma, conta) => soma + obterPago(conta),
        0
    );

    const totalPendente = contas.reduce(
        (soma, conta) => soma + obterSaldo(conta),
        0
    );

    const quantidadePendentes = contas.filter(
        conta => obterSaldo(conta) > 0
    ).length;

    document.getElementById("total-vendido").textContent = moeda(totalVendido);
    document.getElementById("total-recebido").textContent = moeda(totalRecebido);
    document.getElementById("total-pendente").textContent = moeda(totalPendente);

    document.getElementById("quantidade-pendentes").textContent =
        quantidadePendentes;
}

// TABELA DE CONTAS

function renderizarContas() {
    const pesquisa = pesquisaConta.value.toLowerCase().trim();
    const filtro = filtroStatus.value;

    const filtradas = contas.filter(conta => {
        const cliente = obterCliente(conta).toLowerCase();
        const id = String(obterId(conta));

        const correspondePesquisa =
            cliente.includes(pesquisa) || id.includes(pesquisa);

        const status = obterStatus(conta);

        const correspondeStatus =
            filtro === "todas" || status === filtro;

        return correspondePesquisa &&
            correspondeStatus &&
            obterSaldo(conta) > 0;
    });

    document.getElementById("contador-contas").textContent =
        `${filtradas.length} conta(s) encontrada(s)`;

    if (filtradas.length === 0) {
        listaContas.innerHTML = `
            <tr><td colspan="8">Nenhuma conta em aberto encontrada.</td></tr>
        `;
        return;
    }

    listaContas.innerHTML = filtradas.map(conta => {
        const id = obterId(conta);
        const status = obterStatus(conta);

        return `
            <tr>
                <td>
                    <span class="account-sale-id">#${escaparHTML(id)}</span>
                </td>

                <td>
                    <span class="account-client">
                        ${escaparHTML(obterCliente(conta))}
                    </span>
                </td>

                <td>${dataBR(conta.created_at || conta.data)}</td>

                <td>${moeda(obterTotal(conta))}</td>

                <td>${moeda(obterPago(conta))}</td>

                <td><strong>${moeda(obterSaldo(conta))}</strong></td>

                <td>
                    <span class="account-status ${status}">
                        ${status === "parcial" ? "Parcial" : "Pendente"}
                    </span>
                </td>

                <td>
                    <div class="account-actions">
                        <button
                            data-acao="pagar"
                            data-id="${escaparHTML(id)}"
                        >
                            Receber
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// HISTÓRICO DE PAGAMENTOS


async function renderizarPagamentos() {

    listaPagamentos.innerHTML = `
        <tr>
            <td colspan="5">Carregando pagamentos...</td>
        </tr>
    `;

    try {

        const pagamentos = await requisicao(
            `${API_PAGAMENTOS}/history`
        );

        if (!Array.isArray(pagamentos) || pagamentos.length === 0) {

            listaPagamentos.innerHTML = `
                <tr>
                    <td colspan="5">Nenhum pagamento registrado.</td>
                </tr>
            `;

            return;
        }

        listaPagamentos.innerHTML = pagamentos.map(pagamento => `
            <tr>
                <td>
                    <span class="account-sale-id">
                        #${escaparHTML(pagamento.sale_id)}
                    </span>
                </td>

                <td>
                    ${escaparHTML(pagamento.customer_name)}
                </td>

                <td>
                    ${dataBR(pagamento.created_at)}
                </td>

                <td>
                    ${escaparHTML(pagamento.payment_method)}
                </td>

                <td>
                    <strong>${moeda(pagamento.amount)}</strong>
                </td>
            </tr>
        `).join("");

    } catch (erro) {

        console.error(erro);

        listaPagamentos.innerHTML = `
            <tr>
                <td colspan="5">Erro ao carregar histórico.</td>
            </tr>
        `;
    }
}


// MODAL

function abrirModal(conta) {
    contaSelecionada = conta;

    document.getElementById("pagamento-venda-id").value = obterId(conta);

    document.getElementById("pagamento-venda").textContent =
        `#${obterId(conta)}`;

    document.getElementById("pagamento-cliente").textContent =
        obterCliente(conta);

    document.getElementById("pagamento-saldo").textContent =
        moeda(obterSaldo(conta));

    const campoValor = document.getElementById("valor-pagamento");

    campoValor.value = "";
    campoValor.max = obterSaldo(conta);

    document.getElementById("forma-pagamento").value = "";
    document.getElementById("mensagem-pagamento").textContent = "";

    modalPagamento.classList.add("active");
}

function fecharModal() {
    modalPagamento.classList.remove("active");
    contaSelecionada = null;
}

// REGISTRAR PAGAMENTO

formPagamento.addEventListener("submit", async event => {
    event.preventDefault();

    if (!contaSelecionada) return;

    const valor = Number(
        document.getElementById("valor-pagamento").value
    );

    const forma_pagamento =
        document.getElementById("forma-pagamento").value;

    const saldo = obterSaldo(contaSelecionada);

    const mensagem = document.getElementById("mensagem-pagamento");

    if (!Number.isFinite(valor) || valor <= 0) {
        mensagem.textContent = "Informe um valor válido.";
        mensagem.className = "erro";
        return;
    }

    if (valor > saldo + 0.000001) {
        mensagem.textContent = "O valor não pode ser maior que o saldo devedor.";
        mensagem.className = "erro";
        return;
    }

    if (!forma_pagamento) {
        mensagem.textContent = "Selecione a forma de pagamento.";
        mensagem.className = "erro";
        return;
    }

    const botao = document.getElementById("btn-salvar-pagamento");

    botao.disabled = true;
    botao.textContent = "Registrando...";

    try {
        await requisicao(`${API_PAGAMENTOS}/${obterId(contaSelecionada)}`, {
            method: "POST",
            body: JSON.stringify({
                valor,
                forma_pagamento
            })
        });

        fecharModal();

        await carregarContas();

    } catch (erro) {
        mensagem.textContent = erro.message;
        mensagem.className = "erro";

    } finally {
        botao.disabled = false;
        botao.textContent = "Registrar pagamento";
    }
});

// EVENTOS

listaContas.addEventListener("click", event => {
    const botao = event.target.closest("button[data-acao]");

    if (!botao) return;

    const id = Number(botao.dataset.id);

    const conta = contas.find(item => Number(obterId(item)) === id);

    if (conta) abrirModal(conta);
});

pesquisaConta.addEventListener("input", renderizarContas);
filtroStatus.addEventListener("change", renderizarContas);

document.getElementById("btn-atualizar").addEventListener("click", carregarContas);

document.getElementById("btn-fechar-modal").addEventListener("click", fecharModal);
document.getElementById("btn-cancelar").addEventListener("click", fecharModal);

modalPagamento.addEventListener("click", event => {
    if (event.target === modalPagamento) fecharModal();
});

// INICIALIZAÇÃO

carregarContas();
