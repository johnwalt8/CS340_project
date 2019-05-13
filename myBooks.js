// myBooks.js

// Walter Johnson
// CS290, Winter 2019, final project

"use strict";

// one constant to rule them all
const MBG = {
    express: null,
    app: null,
    handlebars: null,
    bodyParser: null,
    path: null,
    mysql: null,
    con: null,              // database connection
    info: null,             // implementation specific values
    fs: null,
    shuffleArray: null      // function to change order of slideshow
};

MBG.express = require('express');

MBG.app = MBG.express();
MBG.handlebars = require('express-handlebars').create({defaultLayout: 'main'});
MBG.bodyParser = require('body-parser');

MBG.app.use(MBG.bodyParser.urlencoded({extended: false}));
MBG.app.use(MBG.bodyParser.json());

MBG.app.engine('handlebars', MBG.handlebars.engine);
MBG.app.set('view engine', 'handlebars');

MBG.path = require('path');
//MBG.info = require(MBG.path.resolve(__dirname, "./info.js"));
MBG.info = require("./info.js");

MBG.app.set('port', MBG.info.port);

//MBG.app.use(MBG.express.static(MBG.path.join(__dirname, '/public')));
MBG.app.use(MBG.express.static('public'));

MBG.mysql = require('mysql');

MBG.con = MBG.mysql.createConnection({
    host: MBG.info.host,
    user: MBG.info.user,
    password: MBG.info.password,
    database: MBG.info.database
});

MBG.fs = require('fs');

MBG.shuffleArray = function (array) {
    var i, j, temp;
    for (i = array.length - 1; i > 0; i -= 1) {
        j = Math.floor(Math.random() * (i + 1));
        temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
};

// home page
MBG.app.get('/', function (req, res) {
    var i, imagesFolder, context = {};
    context.items = [];
    imagesFolder = './public/images/';// images for slideshow
    MBG.fs.readdir(imagesFolder, function (err, images) {
        if (err) {
            context.error = "Error: could not find image files";
            throw err;
        }
        MBG.shuffleArray(images);
        for (i = 0; i < images.length; i += 1) {
            if (MBG.path.extname(images[i].toLowerCase()) === '.jpg') {
                context.items.push({"image": images[i]});
            }
        }
        res.render('myBooksHome', context);
    });
});

// list of authors
MBG.app.get('/myBooksAuthors', function (req, res) {
    var context = {}, query = "SELECT * FROM Author ORDER BY author_last_name";
    MBG.con.query(query, function (err, result) {
        if (err) {
            context.error = "Error: Could not connect to database.  Please try again later.";
            throw err;
        }
        context.authors = result;
        context.length = result.length;
        res.render('myBooksAuthors', context);
    });
});

// list of books
MBG.app.get('/myBooksBooks', function (req, res) {
    var context = {}, 
        query = "SELECT Book.isbn, Book.book_title, Book.author_id, Author.author_last_name, Author.author_first_name, Author_mid_name FROM Book, Author WHERE Book.author_id = Author.author_id ORDER BY Book.book_title";
    MBG.con.query(query, function (err, result) {
        if (err) {
            context.error = "Error: Could not connect to database.  Please try again later.";
            throw err;
        }
        context.books = result;
        context.length = result.length;
        res.render('myBooksBooks', context);
    });
});

// selected author and books by same listed
MBG.app.get('/thisAuthor', function (req, res) {
    var queryAuthor, queryBooks, context = {};

    queryAuthor = "SELECT author_last_name, author_first_name, author_mid_name FROM Author WHERE author_id = (?)";
    queryBooks = "SELECT isbn, book_title, orig_pub_date FROM Book WHERE author_id = (?) ORDER BY orig_pub_date;";

    MBG.con.query(queryAuthor, [req.query.authorid], function (err, resultAuthor) {
        if (err) {
            context.error = "Error: Could not connect to database.  Please try again later.";
            throw err;
        }
        context.author = resultAuthor[0];
        MBG.con.query(queryBooks, [req.query.authorid], function (err, resultBooks) {
            if (err) {
                context.error = "Error: Could not connect to database.  Please try again later.";
                throw err;
            }
            context.length = resultBooks.length;
            if (context.length === 1) {
                context.s = "";
            } else {
                context.s = "s";
            }
            context.books = resultBooks;
            res.render('thisAuthor', context);
        });
    });
});

// selected book
MBG.app.get('/thisBook', function (req, res) {
    var queryAuthor, queryBook, context = {};

    queryBook = "SELECT * FROM Book WHERE isbn = (?)";
    queryAuthor = "SELECT author_last_name, author_first_name, author_mid_name FROM Author WHERE author_id = (?)";

    MBG.con.query(queryBook, [req.query.isbn], function (err, resultBook) {
        if (err) {
            context.error = "Error: Could not connect to database.  Please try again later.";
            throw err;
        }
        context.book = resultBook[0];
        MBG.con.query(queryAuthor, [resultBook[0].author_id], function (err, resultAuthor) {
            if (err) {
                context.error = "Error: Could not connect to database.  Please try again later.";
                throw err;
            }
            context.author = resultAuthor[0];
            res.render('thisBook', context);
        });
    });
});

// form to add or edit book
MBG.app.get('/myBooksAddEdit', function (req, res) {
    var queryClass, queryRating, context = {};

    queryClass = "SELECT class_id, class_name FROM Classification";
    queryRating = "SELECT * FROM Book_Rating ORDER BY book_rate_id DESC";

    MBG.con.query(queryClass, function (err, resultClass) {
        if (err) {
            context.error = "Could not connect to database.  Please try again later.";
            throw err;
        }
        context.classes = resultClass;
        MBG.con.query(queryRating, function (err, resultRating) {
            if (err) {
                context.error = "Could not connect to database.  Please try again later.";
                throw err;
            }
            context.ratings = resultRating;
            res.render('myBooksAddEdit', context);
        });
    });
});

// looks up book by isbn, fills in form if book is listed
MBG.app.get('/isbnResults', function (req, res) {
    var queryAuthor, queryBook, response = {};

    queryBook = "SELECT * FROM Book WHERE isbn = (?)";
    queryAuthor = "SELECT author_last_name, author_first_name, author_mid_name FROM Author WHERE author_id = (?)";

    MBG.con.query(queryBook, [req.query.isbn], function (err, resultBook) {
        if (err) {
            response.error = "Could not connect to database.  Please try again later.";
            res.type('plain/text');
            res.status(500);
            res.send('500 - Server Error');
            throw err;
        }
        if (resultBook[0]) {
            response.book = resultBook[0];
            MBG.con.query(queryAuthor, [resultBook[0].author_id], function (err, resultAuthor) {
                if (err) {
                    response.error = "Could not connect to database.  Please try again later.";
                    res.type('plain/text');
                    res.status(500);
                    res.send('500 - Server Error');
                    throw err;
                }
                response.author = resultAuthor[0];
                res.type('application/json');
                res.status(200);
                res.send(response);
            });
        } else {
            response.book = "Book not listed.";
            res.type('application/json');
            res.status(200);
            res.send(response);
        }
    });
});

// result of add/edit button on myBooksAddEdit page
MBG.app.post('/addEditBook', function (req, res) {
    var response = "The server has received this data, but the database has not been updated as that functionality does not yet exist.";
    res.type('plain/text');
    res.status(200);
    res.send(response);
});

MBG.app.use(function (req, res) {
    res.status(404);
    res.render('404');
});

MBG.app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.type('plain/text');
    res.status(500);
    res.render('500');
});

MBG.app.listen(MBG.app.get('port'), function () {
    console.log('Express started on http://localhost:' + MBG.app.get('port') + '; press Ctrl-C to terminate.');
});
