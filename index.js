const express = require("express")
const app = express()

const Controller = require('./controller.js')
const port = 3000;


app.use(express.static('public'))   //##
app.set('views', './public/views')  //## EJS 
app.set('view engine', 'ejs')       //##

app.listen(port, () => console.log("Servidor rodando na porta", port))
app.get("/", async (req, res) => {
    const receitas = await Controller.Recipes.get("popularidade-decres")
    const recentes = await Controller.Recipes.get("popularidade-decres")
    return res.render("home", { receitas: receitas, recentes: recentes })
})
app.get(/^\/\p\/(.+)/, async (req, res) => {  //## Regex for handling slashes of link
    const href = "/" + req.params[0]
    const hrefs = await Controller.Recipes.getHrefs()
    if (hrefs.includes(href)) {
        await Controller.Recipes.Views.add(href)
        res.render('receita', { receita: await Controller.Recipes.getByHref(href) })
    } else {
        res.send("aw noes")
    }
})
app.get('/new', async (req, res) => {
    res.render("newPage")
})
app.post('/new', async (req, res) => {
    if (req.body.nome && req.body.ingredientes.length && req.body.passos.length) {
        const recipe = await Controller.Recipes.make(req.body.nome,
            req.body.ingredientes, req.body.passos)
        const added = await Controller.Recipes.add(recipe)
        if (added) {
            return res.json({
                message: "Tudo certo",
                status: 200
            })
        } else {
            return res.json({
                message: "Algo não ocorreu como planejado. Tente novamente mais tarde.",
                status: 500
            })
        }

    } else {
        return res.json({
            message:
                "Por favor, preencha todos os campos obrigatórios para continuar: (Nome, Ingredientes e Passos)"
            , status: 401
        });
    }
})
app.post('/vote', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
    if (req.body.href && req.body.thumbUp) {
        Controller.Recipes.vote(req.body.href, ip, req.body.thumbUp)
        return res.json({
            message: "Tudo certo",
            status: 200
        })
    } else {
        return res.json({
            message: "Algo não ocorreu como planejado. Tente novamente mais tarde.",
            status: 400
        })
    }

})
app.post('/comment', async (req, res) => {
    if (req.body.href && req.body.comentario.nome && req.body.comentario.comentario) {
        await Controller.Comments.make(req.body.href, req.body.comentario)
        return res.json({
            message: "Tudo certo",
            status: 200
        })
    } else {
        return res.json({
            message:
                "Por favor, preencha todos os campos obrigatórios para continuar: (Nome e o comentário em si)"
            , status: 401
        });
    }

})
app.post("/del-comment", async (req, res) => {

})