
async function carregarDashboard() {
    try {
        const resposta = await fetch("/api/products");

        if (!resposta.ok) {
            throw new Error("Erro ao buscar produtos");
        }

        const produtos = await resposta.json();

        console.log("Produtos recebidos do banco:", produtos);

        // CONTADORES
        const totalProdutos = produtos.length;

        const totalUnidades = produtos.reduce((total, produto) => {
            return total + Number(produto.unidades || 0);
        }, 0);

        const estoqueBaixo = produtos.filter(produto => {
            const unidades = Number(produto.unidades);
            return unidades > 0 && unidades <= 5;
        }).length;

        const produtosEsgotados = produtos.filter(produto => {
            return Number(produto.unidades) === 0;
        }).length;

        // ATUALIZAR INDICADORES
        document.getElementById("total-produtos").textContent = totalProdutos;
        document.getElementById("total-unidades").textContent = totalUnidades;
        document.getElementById("estoque-baixo").textContent = estoqueBaixo;
        document.getElementById("produtos-esgotados").textContent = produtosEsgotados;

        // PRODUTOS RECENTES
        const tabela = document.getElementById("produtos-recentes");

        tabela.innerHTML = "";

        produtos.slice(0, 5).forEach(produto => {
            const unidades = Number(produto.unidades);

            let status = "Disponível";
            let classe = "available";

            if (unidades === 0) {
                status = "Esgotado";
                classe = "out-stock";
            } else if (unidades <= 5) {
                status = "Estoque baixo";
                classe = "low-stock";
            }

            tabela.innerHTML += `
                <tr>
                    <td>${produto.nome}</td>
                    <td>${produto.descricao || "-"}</td>
                    <td>${Number(produto.price).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL"
                    })}</td>
                    <td>${unidades} unidades</td>
                    <td>
                        <span class="status ${classe}">
                            ${status}
                        </span>
                    </td>
                </tr>
            `;
        });

    } catch (erro) {
        console.error("Erro ao carregar dashboard:", erro);
    }
}

carregarDashboard();