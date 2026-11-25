"""Testes de interface do Eletro Store com Selenium.

Uso:
  pip install selenium
  python test_eletro_store.py

Pré-requisitos:
  - Node.js e dependências do projeto instaladas.
  - Banco preparado com: node ./src/make-db.js
  - Servidor iniciado em outro terminal: npm start
  - Google Chrome instalado. Selenium Manager tenta localizar o driver.

Os testes criam e removem um produto temporário. Também registram duas vendas
(uma à vista e uma a prazo) e um pagamento parcial para validar os fluxos.
Essas transações permanecem no banco; o estoque do produto utilizado nas vendas
é recomposto ao final.
"""

import os
import time
import unittest
from datetime import datetime

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait, Select


BASE_URL = os.getenv("ELETRO_STORE_URL", "http://localhost:3000")
ADMIN_EMAIL = os.getenv("ELETRO_STORE_EMAIL", "admin@eletrostore.com")
ADMIN_PASSWORD = os.getenv("ELETRO_STORE_PASSWORD", "admin123")
WAIT_SECONDS = 12


class EletroStoreTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        options = webdriver.ChromeOptions()
        if os.getenv("SELENIUM_HEADLESS", "0") == "1":
            options.add_argument("--headless=new")
        options.add_argument("--window-size=1440,1000")
        options.add_argument("--disable-notifications")
        cls.driver = webdriver.Chrome(options=options)
        cls.wait = WebDriverWait(cls.driver, WAIT_SECONDS)
        cls.nome_teste = "Produto Selenium " + datetime.now().strftime("%Y%m%d%H%M%S")
        cls.nome_cliente = "Cliente Selenium " + datetime.now().strftime("%H%M%S")
        cls.produto_venda_nome = None
        cls.produto_venda_id = None
        cls.estoque_inicial = None
        cls.quantidade_vendida = 2
        cls.produto_temporario_criado = False

    @classmethod
    def tearDownClass(cls):
        # Recompõe o estoque consumido pelas vendas, para não alterar a
        # quantidade original do produto de catálogo.
        try:
            if cls.produto_venda_nome and cls.estoque_inicial is not None:
                cls.driver.get(BASE_URL + "/estoque.html")
                campo = cls.wait.until(EC.presence_of_element_located((By.ID, "pesquisa-estoque")))
                campo.clear()
                campo.send_keys(cls.produto_venda_nome)
                linha = cls.wait.until(EC.presence_of_element_located((
                    By.XPATH, f"//tr[.//*[normalize-space()='{cls.produto_venda_nome}']]"
                )))
                atual = int(linha.find_element(By.CSS_SELECTOR, ".stock-quantity").text)
                diferenca = cls.estoque_inicial - atual
                if diferenca > 0:
                    linha.find_element(By.CSS_SELECTOR, "button[data-acao='entrada']").click()
                    cls.wait.until(EC.visibility_of_element_located((By.ID, "modal-movimentacao")))
                    cls.driver.find_element(By.ID, "quantidade-movimentacao").send_keys(str(diferenca))
                    cls.driver.find_element(By.ID, "form-movimentacao").submit()
                    cls.wait.until(EC.invisibility_of_element_located((By.ID, "modal-movimentacao")))
        except Exception as exc:
            print(f"AVISO: não foi possível recompor o estoque automaticamente: {exc}")

        try:
            if cls.produto_temporario_criado:
                cls.driver.get(BASE_URL + "/produtos.html")
                campo = cls.wait.until(EC.presence_of_element_located((By.ID, "pesquisa-produto")))
                campo.send_keys(cls.nome_teste)
                linha = cls.wait.until(EC.presence_of_element_located((
                    By.XPATH, f"//tr[.//*[normalize-space()='{cls.nome_teste}']]"
                )))
                cls.driver.execute_script("window.confirm = () => true;")
                linha.find_element(By.CSS_SELECTOR, "button[data-action='excluir']").click()
        except Exception as exc:
            print(f"AVISO: não foi possível remover o produto temporário: {exc}")

        try:
            cls.driver.quit()
        except Exception:
            pass

    def wait_text(self, by, selector, expected):
        self.wait.until(lambda d: expected in d.find_element(by, selector).text)

    def login(self):
        self.driver.get(BASE_URL + "/login")
        self.driver.find_element(By.ID, "login-user").send_keys(ADMIN_EMAIL)
        self.driver.find_element(By.ID, "login-password").send_keys(ADMIN_PASSWORD)
        self.driver.find_element(By.ID, "login-form").submit()
        self.wait.until(EC.url_contains("/dashboard"))

    def api_get(self, path):
        return self.driver.execute_async_script("""
            const path = arguments[0];
            const done = arguments[arguments.length - 1];
            fetch(path).then(r => r.json().then(data => done({status:r.status, data})))
              .catch(e => done({status:0, error:String(e)}));
        """, path)

    def test_fluxo_principal(self):
        # 1) Páginas administrativas protegidas sem sessão.
        self.driver.get(BASE_URL + "/login")
        self.driver.get(BASE_URL + "/produtos.html")
        self.wait.until(EC.url_contains("/login"))

        # 2) Login inválido deve exibir erro, sem entrar no painel.
        self.driver.find_element(By.ID, "login-user").send_keys(ADMIN_EMAIL)
        self.driver.find_element(By.ID, "login-password").send_keys("senha_incorreta")
        self.driver.find_element(By.ID, "login-form").submit()
        self.wait.until(lambda d: d.find_element(By.ID, "login-error").text.strip() != "")
        self.assertIn("incorret", self.driver.find_element(By.ID, "login-error").text.lower())

        # 3) Login válido.
        self.driver.find_element(By.ID, "login-password").clear()
        self.driver.find_element(By.ID, "login-password").send_keys(ADMIN_PASSWORD)
        self.driver.find_element(By.ID, "login-form").submit()
        self.wait.until(EC.url_contains("/dashboard"))

        # 4) CRUD de produto: cadastrar, editar e excluir um produto isolado.
        self.driver.get(BASE_URL + "/produtos.html")
        self.wait.until(EC.presence_of_element_located((By.ID, "lista-produtos")))
        self.driver.find_element(By.ID, "btn-novo-produto").click()
        self.wait.until(EC.visibility_of_element_located((By.ID, "modal-produto")))
        self.driver.find_element(By.ID, "produto-nome").send_keys(self.nome_teste)
        self.driver.find_element(By.ID, "produto-descricao").send_keys("Criado automaticamente pelo Selenium")
        self.driver.find_element(By.ID, "produto-preco").send_keys("12.50")
        self.driver.find_element(By.ID, "produto-quantidade").send_keys("4")
        self.driver.find_element(By.ID, "form-produto").submit()
        self.wait.until(EC.invisibility_of_element_located((By.ID, "modal-produto")))
        self.wait.until(EC.presence_of_element_located((By.XPATH, f"//tr[.//*[normalize-space()='{self.nome_teste}']]")))
        self.produto_temporario_criado = True

        linha = self.driver.find_element(By.XPATH, f"//tr[.//*[normalize-space()='{self.nome_teste}']]")
        linha.find_element(By.CSS_SELECTOR, "button[data-action='editar']").click()
        self.wait.until(EC.visibility_of_element_located((By.ID, "modal-produto")))
        descricao = self.driver.find_element(By.ID, "produto-descricao")
        descricao.clear()
        descricao.send_keys("Descrição alterada pelo teste")
        self.driver.find_element(By.ID, "form-produto").submit()
        self.wait.until(EC.invisibility_of_element_located((By.ID, "modal-produto")))

        # Excluir antes de criar movimentações ou vendas para esse produto.
        linha = self.driver.find_element(By.XPATH, f"//tr[.//*[normalize-space()='{self.nome_teste}']]")
        self.driver.execute_script("window.confirm = () => true;")
        linha.find_element(By.CSS_SELECTOR, "button[data-action='excluir']").click()
        self.wait.until(EC.invisibility_of_element_located((By.XPATH, f"//tr[.//*[normalize-space()='{self.nome_teste}']]")))
        self.produto_temporario_criado = False

        # 5) Seleciona um produto existente com estoque suficiente para vendas.
        produtos = self.api_get("/api/products")
        self.assertEqual(produtos["status"], 200, produtos)
        disponiveis = [p for p in produtos["data"] if int(p.get("unidades", 0)) >= 8]
        self.assertTrue(disponiveis, "É necessário haver um produto com pelo menos 8 unidades no estoque.")
        escolhido = disponiveis[0]
        self.produto_venda_nome = escolhido["nome"]
        self.produto_venda_id = escolhido["id"]
        self.estoque_inicial = int(escolhido["unidades"])

        # 6) Entrada e saída de estoque com saldo líquido zero.
        self.driver.get(BASE_URL + "/estoque.html")
        self.wait.until(EC.presence_of_element_located((By.ID, "lista-estoque")))
        busca = self.driver.find_element(By.ID, "pesquisa-estoque")
        busca.send_keys(self.produto_venda_nome)
        linha = self.wait.until(EC.presence_of_element_located((
            By.XPATH, f"//tr[.//*[normalize-space()='{self.produto_venda_nome}']]"
        )))
        linha.find_element(By.CSS_SELECTOR, "button[data-acao='entrada']").click()
        self.wait.until(EC.visibility_of_element_located((By.ID, "modal-movimentacao")))
        self.driver.find_element(By.ID, "quantidade-movimentacao").send_keys("3")
        self.driver.find_element(By.ID, "form-movimentacao").submit()
        self.wait.until(EC.invisibility_of_element_located((By.ID, "modal-movimentacao")))

        busca = self.driver.find_element(By.ID, "pesquisa-estoque")
        linha = self.wait.until(EC.presence_of_element_located((
            By.XPATH, f"//tr[.//*[normalize-space()='{self.produto_venda_nome}']]"
        )))
        linha.find_element(By.CSS_SELECTOR, "button[data-acao='saida']").click()
        self.wait.until(EC.visibility_of_element_located((By.ID, "modal-movimentacao")))
        self.driver.find_element(By.ID, "quantidade-movimentacao").send_keys("3")
        self.driver.find_element(By.ID, "form-movimentacao").submit()
        self.wait.until(EC.invisibility_of_element_located((By.ID, "modal-movimentacao")))

        # 7) Venda à vista.
        self.driver.get(BASE_URL + "/vendas.html")
        self.wait.until(EC.presence_of_element_located((By.ID, "lista-produtos-venda")))
        busca_venda = self.driver.find_element(By.ID, "pesquisa-produto-venda")
        busca_venda.send_keys(self.produto_venda_nome)
        card = self.wait.until(EC.presence_of_element_located((
            By.XPATH, f"//article[contains(@class,'sale-product')][.//*[normalize-space()='{self.produto_venda_nome}']]"
        )))
        card.find_element(By.CSS_SELECTOR, "button[data-adicionar]").click()
        self.driver.find_element(By.ID, "cliente-nome").send_keys(self.nome_cliente + " Vista")
        self.driver.find_element(By.ID, "btn-finalizar-venda").click()
        self.wait.until(lambda d: "sucesso" in d.find_element(By.ID, "mensagem-venda").get_attribute("class").lower()
                        or "sucesso" in d.find_element(By.ID, "mensagem-venda").text.lower())

        # 8) Venda a prazo.
        self.driver.find_element(By.ID, "pesquisa-produto-venda").clear()
        self.driver.find_element(By.ID, "pesquisa-produto-venda").send_keys(self.produto_venda_nome)
        card = self.wait.until(EC.presence_of_element_located((
            By.XPATH, f"//article[contains(@class,'sale-product')][.//*[normalize-space()='{self.produto_venda_nome}']]"
        )))
        card.find_element(By.CSS_SELECTOR, "button[data-adicionar]").click()
        self.driver.find_element(By.ID, "cliente-nome").send_keys(self.nome_cliente + " Prazo")
        Select(self.driver.find_element(By.ID, "tipo-venda")).select_by_value("prazo")
        self.driver.find_element(By.ID, "btn-finalizar-venda").click()
        self.wait.until(lambda d: "success" in d.find_element(By.ID, "mensagem-venda").get_attribute("class").lower()
                        or "sucesso" in d.find_element(By.ID, "mensagem-venda").text.lower())

        # 9) Registrar pagamento parcial da venda a prazo.
        self.driver.get(BASE_URL + "/contas.html")
        self.wait.until(EC.presence_of_element_located((By.ID, "lista-contas")))
        busca_conta = self.driver.find_element(By.ID, "pesquisa-conta")
        busca_conta.send_keys(self.nome_cliente + " Prazo")
        linha_conta = self.wait.until(EC.presence_of_element_located((
            By.XPATH, f"//tr[.//*[contains(normalize-space(),'{self.nome_cliente} Prazo')]]"
        )))
        linha_conta.find_element(By.CSS_SELECTOR, "button[data-acao='pagar']").click()
        self.wait.until(EC.visibility_of_element_located((By.ID, "modal-pagamento")))
        self.driver.find_element(By.ID, "valor-pagamento").send_keys("1.00")
        Select(self.driver.find_element(By.ID, "forma-pagamento")).select_by_value("pix")
        self.driver.find_element(By.ID, "form-pagamento").submit()
        self.wait.until(EC.invisibility_of_element_located((By.ID, "modal-pagamento")))

        # 10) Verifica páginas de documentos e histórico de vendas.
        self.driver.get(BASE_URL + "/documentos.html")
        self.wait.until(EC.presence_of_element_located((By.ID, "lista-documentos")))
        self.assertIn("Documentos", self.driver.title)
        pesquisa_documento = self.driver.find_element(By.ID, "pesquisa-documento")
        pesquisa_documento.send_keys(self.nome_cliente + " Prazo")
        linha_documento = self.wait.until(EC.presence_of_element_located((
            By.XPATH, f"//tr[.//*[contains(normalize-space(),'{self.nome_cliente} Prazo')]]"
        )))
        linha_documento.find_element(By.CSS_SELECTOR, "button[data-acao='detalhes']").click()
        self.wait.until(EC.visibility_of_element_located((By.ID, "modal-documento")))
        self.assertTrue(self.driver.find_element(By.ID, "conteudo-documento").text.strip())
        self.driver.find_element(By.ID, "btn-fechar-documento").click()
        self.wait.until(EC.invisibility_of_element_located((By.ID, "modal-documento")))
        linha_documento = self.driver.find_element(By.XPATH, f"//tr[.//*[contains(normalize-space(),'{self.nome_cliente} Prazo')]]")
        linha_documento.find_element(By.CSS_SELECTOR, "button[data-acao='nota']").click()
        self.wait.until(EC.visibility_of_element_located((By.ID, "modal-documento")))
        self.assertTrue(self.driver.find_element(By.ID, "conteudo-documento").text.strip())

        self.driver.get(BASE_URL + "/vendas.html")
        self.wait.until(EC.presence_of_element_located((By.ID, "lista-vendas")))
        self.wait.until(lambda d: self.nome_cliente in d.find_element(By.ID, "lista-vendas").text)

        print("\nSUCESSO: fluxos de autenticação, produtos, estoque, vendas, pagamento e documentos verificados.")


if __name__ == "__main__":
    unittest.main(verbosity=2)
