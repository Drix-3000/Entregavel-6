
const express = require("express");
const router = express.Router();

const db = require("../init-db");
const verificarAdmin = require("../middlewares/authMiddleware");

// =========================================
// CONSULTAR DADOS DA CONTA
// =========================================

router.get("/profile", verificarAdmin, (req, res) => {

    const admin = db.prepare(`
        SELECT id, nome, email
        FROM admins
        WHERE id = ?
    `).get(req.session.admin.id);

    if (!admin) {
        return res.status(404).json({
            erro: "Administrador não encontrado"
        });
    }

    res.json(admin);
});

// =========================================
// ATUALIZAR NOME E EMAIL
// =========================================

router.put("/profile", verificarAdmin, (req, res) => {

    const { nome, email, senha_atual } = req.body;

    if (!nome || !email || !senha_atual) {
        return res.status(400).json({
            erro: "Preencha todos os campos"
        });
    }

    const nomeFinal = nome.trim();
    const emailFinal = email.trim().toLowerCase();

    if (nomeFinal.length < 2) {
        return res.status(400).json({
            erro: "O nome deve ter pelo menos 2 caracteres"
        });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFinal)) {
        return res.status(400).json({
            erro: "Informe um e-mail válido"
        });
    }

    const admin = db.prepare(`
        SELECT *
        FROM admins
        WHERE id = ?
    `).get(req.session.admin.id);

    if (!admin) {
        return res.status(404).json({
            erro: "Administrador não encontrado"
        });
    }

    if (admin.senha !== senha_atual) {
        return res.status(401).json({
            erro: "Senha atual incorreta"
        });
    }

    try {

        db.prepare(`
            UPDATE admins
            SET nome = ?, email = ?
            WHERE id = ?
        `).run(nomeFinal, emailFinal, admin.id);

        // Atualiza os dados armazenados na sessão
        req.session.admin.nome = nomeFinal;
        req.session.admin.email = emailFinal;

        res.json({
            sucesso: true,
            mensagem: "Dados da conta atualizados",
            admin: req.session.admin
        });

    } catch (error) {

        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                erro: "Este e-mail já está sendo utilizado"
            });
        }

        console.error(error);

        res.status(500).json({
            erro: "Erro ao atualizar os dados da conta"
        });
    }
});

// =========================================
// ALTERAR SENHA
// =========================================

router.put("/password", verificarAdmin, (req, res) => {

    const { senha_atual, nova_senha, confirmar_senha } = req.body;

    if (!senha_atual || !nova_senha || !confirmar_senha) {
        return res.status(400).json({
            erro: "Preencha todos os campos"
        });
    }

    if (nova_senha.length < 6) {
        return res.status(400).json({
            erro: "A nova senha deve ter pelo menos 6 caracteres"
        });
    }

    if (nova_senha !== confirmar_senha) {
        return res.status(400).json({
            erro: "As senhas não coincidem"
        });
    }

    const admin = db.prepare(`
        SELECT *
        FROM admins
        WHERE id = ?
    `).get(req.session.admin.id);

    if (!admin) {
        return res.status(404).json({
            erro: "Administrador não encontrado"
        });
    }

    if (admin.senha !== senha_atual) {
        return res.status(401).json({
            erro: "Senha atual incorreta"
        });
    }

    db.prepare(`
        UPDATE admins
        SET senha = ?
        WHERE id = ?
    `).run(nova_senha, admin.id);

    res.json({
        sucesso: true,
        mensagem: "Senha alterada com sucesso"
    });
});

module.exports = router;
