var Datastore = require('nedb')
var db = {}
db.recipes = new Datastore("recipes.db")
db.users = new Datastore("users.db")
function generateString(len) {
  return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, len);
}
return module.exports = {
  Recipes: {
    make: async function(nome, ingredientes, passos) {
      if (nome) {
        db.recipes.loadDatabase()
        var recipe = new Promise((resolve, reject) => {
          db.recipes.count({
            href: '/' + nome.replace(/\s/g, "-").toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          }, function(e, n) {
            resolve({
              nome: nome,
              criadoEm: new Date().getTime(),
              ingredientes: ingredientes, // {quantidade:INTEGER, ingrediente: STRING}
              passos: passos,
              href: '/' + nome.replace(/\s/g, "-").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") + "/" + n,
              votes: { up: 0, down: 0 },
              views: 0,
              comentarios: [], // {nome:STRING, comentario: STRING, id: RANDOMSTRING}
            })

          });
        })
        return recipe.then(a => a)
      } else { return null }
    },
    add: function(recipe) {
      db.recipes.insert(recipe)
    },
    getHrefs: function() {
      db.recipes.loadDatabase()
      var promise = new Promise((resolve, reject) => {
        db.recipes.find({}, function(err, recipes) {
          resolve(recipes.map(x => x.href))
        })
      })
      return promise.then(a => a)
    },
    getByHref: function(href) {
      db.recipes.loadDatabase()
      var promise = new Promise((resolve, reject) => {
        db.recipes.find({ href: href }, (er, recipes) => {
          if (er) return resolve(false);
          resolve(recipes[0])

        })
      })
      return promise.then(a => a)
    },
    get: function() {
      db.recipes.loadDatabase()
      var promise = new Promise((resolve, reject) => {
        db.recipes.find({},function(err, recipes) {
          if (err) console.log(err)
          return resolve(recipes)
        })
      })
      return promise.then(a => a)
    },
    Views: {
      add: function(href) {
        var promise = new Promise((resolve, reject) => {
          db.recipes.update({ href: href }, { $inc: { views: 1 } }, {}, (e, n, u) => {
            if (e) return resolve(false)
            return resolve(true)
          })
        })
        return promise.then(a => a)
      },
      clear: function(href) {
        var promise = new Promise((resolve, reject) => {
          db.recipes.update({ href: href }, { $set: { views: 0 } }, {}, (e, n, u) => {
            if (e) return resolve(false)
            return resolve(true)
          })
        })
        return promise.then(a => a)
      }
    }
  },
  addUser: function(ip, firstVote) {
    var promise = new Promise((resolve, reject) => {
      if (firstVote) {
        db.users.insert({ ip: ip, votes: [firstVote] },
          (err, d) => {
            if (err) { resolve(false) }
            if (firstVote.like) {
              db.recipes.update({ href: firstVote.href },
                { $inc: { "votes.up": 1 } }, {}, (e, nou, u) => {
                  if (!e) { resolve(true) } else { resolve(false) }
                })
            } else {
              db.recipes.update({ href: firstVote.href },
                { $inc: { "votes.down": 1 } }, {}, (e, nou, u) => {
                  if (!e) { resolve(true) } else { resolve(false) }
                }

              )
            }
          })
      } else {
        db.users.insert({ ip: ip, votes: [] },
          (e, d) => {
            if (!e) { resolve(true) } else { resolve(false) }
          })
      }
    })
    return promise.then(a => a)
  },
  Comments: {
    make: function(href, comentario) {
      db.recipes.loadDatabase()
      var promise = new Promise((resolve, reject) => {
        db.recipes.update({ href: href },
          {
            $push:
            {
              comentarios: {
                nome: comentario.nome,
                comentario: comentario.comentario,
                timestamp: new Date().getTime(),
                id: generateString(10)
              }
            }
          },
          { multi: true }, (er, nou, u) => {
            if (!er) { resolve(true); } else { resolve(false); }
          })
      });
      return promise.then(a => a)
    },
    clear: function(href) {
      var promise = new Promise((resolve, reject) => {
        db.recipes.update({ href: href }, { $set: { comentarios: [] } }, {}, (e, n, u) => {
          if (e) return resolve(false)
          return resolve(true)
        })
      })
      return promise.then(a => a)
    },
    delete: function(href, idComentario) {
      db.recipes.loadDatabase()
      var promise = new Promise((resolve, reject) => {
        db.recipes.update({ href: href }, { $pull: { 'comentarios': { id: idComentario } } }, { multi: true, upsert: false }, (er, nou, u) => {
          if (!err) { resolve(true); } else { resolve(false); }
        })
      })
      return promise.then(a => a)
    }
  },
  vote: function(href, ip, thumbUp) {
    db.users.loadDatabase()
    db.recipes.loadDatabase()
    console.log(`${ip} tentando votar em ${href} como ${thumbUp}`)
    db.users.find({ ip: ip }, async (err, usuarios) => {
      if (err) console.log("bip bip")
      if (usuarios.length) {
        const votes = usuarios[0].votes
        console.log("Seus votos: ", votes)
        var found = false
        for (const [i, _voto] of votes.entries()) {
          if (_voto.href == href) {
            found = true;
            console.log("Aparentemente ele era ",_voto.like)
            if(thumbUp != _voto.like) {
            console.log("Changing mind...")
            if (thumbUp) {
              db.recipes.update({ href: href },
                { $inc: { "votes.up": 1, "votes.down": -1 }, }, { multi: true, upsert: false }, (e, nou, u) => {
                  if (e) console.log("oooops 191"); 
                  
                })
            } else {
              db.recipes.update({ href: href },
                { $inc: { "votes.up": -1, "votes.down": 1 } }, { multi: true, upsert: false }, (e, nou, u) => {
                  if (e) console.log("ooops 196");
                  
                })
            }
            db.users.find({ ip: ip }, (e, d) => {
              if (e) console.log("ooops 112");
              const v = d[0].votes[i].like
              console.log("Currently its ", v);
              const d_ = d[0]
              d_.votes[i].like = !v
              db.users.update({ ip: ip }, { $set: d_ }, {}, (ee, nn, uu) => {
                if (ee) { console.log("ooops 117");  }
              })
            })

          }
          }
        }
        if(!found){
          console.log("Adicioanndo opiniao")
          db.users.update({ ip: ip }, { $push: {votes:{href:href, like:thumbUp} }}, {}, (ee, nn, uu) => {
                if (ee) { console.log("ooops 117");  }
              })
            if (thumbUp) {
              db.recipes.update({ href: href },
                { $inc: { "votes.up": 1, "votes.down": -1 }, }, { multi: true, upsert: false }, (e, nou, u) => {
                  if (e) console.log("oooops 191"); 
                  
                })
            } else {
              db.recipes.update({ href: href },
                { $inc: { "votes.up": -1, "votes.down": 1 } }, { multi: true, upsert: false }, (e, nou, u) => {
                  if (e) console.log("ooops 196");
                  
                })
            }
        }
        
      } else {
        await (this.addUser(ip, { href: href, like: thumbUp }))
      }
    })
  }
}