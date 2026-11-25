
const loginForm = document.getElementById("login-form");

// =================================
// LOGIN
// =================================

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("login-user").value.trim();
        const senha = document.getElementById("login-password").value;
        const erro = document.getElementById("login-error");

        erro.textContent = "";

        try {
            const resposta = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, senha })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                erro.textContent = dados.erro || "Erro ao realizar login.";
                return;
            }

            window.location.href = "/dashboard";

        } catch (error) {
            console.error("Erro no login:", error);
            erro.textContent = "Erro ao conectar com o servidor.";
        }
    });

}

// =================================
// VERIFICAR SESSÃO
// =================================

async function verificarSessao() {

    // Executa somente na tela de login
    if (!loginForm) return;

    try {
        const resposta = await fetch("/api/me");

        if (resposta.ok) {
            window.location.href = "/dashboard";
        }

    } catch (error) {
        console.error("Erro ao verificar sessão:", error);
    }
}

verificarSessao();