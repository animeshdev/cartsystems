var express = require('express'),
    api     = require('./api'),
    users   = require('./accounts'),
    pass = require('./config/pass'),
    app     = express();

app

    .use(express.static('./public'))

    .use(users)
    .all('/api/*', pass.userIsAuthenticated )
    .use('/api', api)
    .get('*', function (req, res) {

        if ( !req.user  ) {
            res.redirect('/login');
        } else {
            res.sendfile('public/main.html');
        }


    })
    .listen(5000);
