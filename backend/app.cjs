var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index.cjs');

var app = express();

// Digital Ocean-specific override for getting the ACTUAL client address
logger.token('remote-addr', function (req, res) { return req.headers['do-connecting-ip'] })

app.use(logger('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

module.exports = app;
