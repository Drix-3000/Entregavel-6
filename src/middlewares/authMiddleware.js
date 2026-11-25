function verificarAdmin(req, res, next) {
    if (!req.session.admin) {

        // Requisições da API recebem erro JSON
        if (req.originalUrl.startsWith("/api/")) {
            return res.status(401).json({
                erro: "Acesso não autorizado"
            });
        }

        // Páginas protegidas redirecionam para o login
        return res.redirect("/login");
    }

    next();
}

module.exports = verificarAdmin;