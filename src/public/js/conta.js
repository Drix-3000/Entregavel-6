
const formPerfil = document.getElementById("form-perfil");
const formSenha = document.getElementById("form-senha");

// =========================================
// ELEMENTOS
// =========================================

const mensagemPerfil = document.getElementById("mensagem-perfil");
const mensagemSenha = document.getElementById("mensagem-senha");

const btnSalvarPerfil = document.getElementById("btn-salvar-perfil");
const btnAlterarSenha = document.getElementById("btn-alterar-senha");

// =========================================
// FUNÇÕES AUXILIARES
// =========================================

function mostrarMensagem(elemento, mensagem, tipo) {
    elemento.textContent = mensagem;
    elemento.className = `account-message ${tipo}`;
}

function esconderMensagem(elemento) {
    elemento.textContent = "";
    elemento.className = "account-message";
}

function iniciais(nome) {
    return nome
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(parte => parte[0])
        .join("")
        .toUpperCase();
}

async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(url, {
        ...opcoes,
        headers: {
            "Content-Type": "application/json",
            ...opcoes.headers
        }
    });

    const dados = await resposta.json().catch(() => ({}));

    if (resposta.status === 401) {
        window.location.href = "/login";
        throw new Error("Sessão expirada");
    }

    if (!resposta.ok) {
        throw new Error(dados.erro || "Ocorreu um erro na operação");
    }

    return dados;
}

// =========================================
// ATUALIZAR INFORMAÇÕES VISUAIS
// =========================================

function atualizarInterface(admin) {
    const avatar = iniciais(admin.nome);

    document.getElementById("nome").value = admin.nome;
    document.getElementById("email").value = admin.email;

    document.getElementById("profile-nome").textContent = admin.nome;
    document.getElementById("profile-avatar").textContent = avatar;

    document.getElementById("sidebar-nome").textContent = admin.nome;
    document.getElementById("sidebar-email").textContent = admin.email;
    document.getElementById("sidebar-avatar").textContent = avatar;
}

// =========================================
// CARREGAR DADOS DA CONTA
// =========================================

async function carregarPerfil() {
    try {
        const admin = await requisicao("/api/admin/profile");

        atualizarInterface(admin);

    } catch (error) {
        mostrarMensagem(
            mensagemPerfil,
            error.message,
            "error"
        );
    }
}

// =========================================
// ATUALIZAR NOME E E-MAIL
// =========================================

formPerfil.addEventListener("submit", async (event) => {
    event.preventDefault();

    esconderMensagem(mensagemPerfil);

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senhaAtual = document.getElementById("senha-atual-perfil").value;

    btnSalvarPerfil.disabled = true;
    btnSalvarPerfil.textContent = "Salvando...";

    try {
        const dados = await requisicao("/api/admin/profile", {
            method: "PUT",
            body: JSON.stringify({
                nome,
                email,
                senha_atual: senhaAtual
            })
        });

        atualizarInterface(dados.admin);

        document.getElementById("senha-atual-perfil").value = "";

        mostrarMensagem(
            mensagemPerfil,
            dados.mensagem,
            "success"
        );

    } catch (error) {
        mostrarMensagem(
            mensagemPerfil,
            error.message,
            "error"
        );

    } finally {
        btnSalvarPerfil.disabled = false;
        btnSalvarPerfil.textContent = "Salvar alterações";
    }
});

// =========================================
// ALTERAR SENHA
// =========================================

formSenha.addEventListener("submit", async (event) => {
    event.preventDefault();

    esconderMensagem(mensagemSenha);

    const senhaAtual = document.getElementById("senha-atual").value;
    const novaSenha = document.getElementById("nova-senha").value;
    const confirmarSenha = document.getElementById("confirmar-senha").value;

    if (novaSenha.length < 6) {
        mostrarMensagem(
            mensagemSenha,
            "A nova senha precisa ter pelo menos 6 caracteres.",
            "error"
        );
        return;
    }

    if (novaSenha !== confirmarSenha) {
        mostrarMensagem(
            mensagemSenha,
            "A confirmação da senha não corresponde.",
            "error"
        );
        return;
    }

    btnAlterarSenha.disabled = true;
    btnAlterarSenha.textContent = "Alterando...";

    try {
        const dados = await requisicao("/api/admin/password", {
            method: "PUT",
            body: JSON.stringify({
                senha_atual: senhaAtual,
                nova_senha: novaSenha,
                confirmar_senha: confirmarSenha
            })
        });

        formSenha.reset();

        mostrarMensagem(
            mensagemSenha,
            dados.mensagem,
            "success"
        );

    } catch (error) {
        mostrarMensagem(
            mensagemSenha,
            error.message,
            "error"
        );

    } finally {
        btnAlterarSenha.disabled = false;
        btnAlterarSenha.textContent = "Alterar senha";
    }
});

// =========================================
// INICIALIZAÇÃO
// =========================================

carregarPerfil();
