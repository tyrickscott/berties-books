const bycrypt = require('bcrypt');  //integrating bcrypt library
const saltRounds = 10;
const { check, validationResult } = require('express-validator');
module.exports = function(app, shopData) {

    const redirectLogin = (req, res, next) => {
        if (!req.session.userId ) {
          res.redirect('./login')
        } else { next (); }
    };


    // Handle our routes
    app.get('/',function(req,res){
        res.render('index.ejs', shopData)
    });
    app.get('/about',function(req,res){
        res.render('about.ejs', shopData);
    });
    app.get('/search',function(req,res){
        res.render("search.ejs", shopData);
    });
    app.get('/search-result', function (req, res) {
        //searching in the database
        //res.send("You searched for: " + req.query.keyword);

        let sqlquery = "SELECT * FROM books WHERE name LIKE '%" + req.query.keyword + "%'"; // query database to get all the books
        // execute sql query
        db.query(sqlquery, (err, result) => {
            if (err) {
                res.redirect('./'); 
            }
            let newData = Object.assign({}, shopData, {availableBooks:result});
            console.log(newData)
            res.render("list.ejs", newData)
         });        
    });
    app.get('/register', function (req,res) {
        res.render('register.ejs', shopData);                                                                     
    });                                                                                                 
    app.post('/registered', [check('email').isEmail(), 
    check('password').isLength({min: 8}).withMessage('Password must be at least 8 characters long')],
     function (req,res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.redirect('./register');
        }
        else {
            //Hash the user's password before saving it in the database
            const plainPassword = req.body.password;
        
            bycrypt.hash(plainPassword, saltRounds, function(err, hashedPassword) {
                //Store hashed password in database
                if (err) {
                    console.error('Error hashing password:' , err);
                    res.send('Error registering user.');
                } 
                else {
                    //Store the user's information in the database
                    const userData = {
                        username: req.body.username,
                        first_name: req.sanitize(req.body.first),
                        last_name: req.body.last,
                        email: req.body.email,
                        hashedPassword: hashedPassword, 
                    };
                    // saving data in database
                    db.query('INSERT INTO users SET ?' , userData, (err, result) => {
                        if (err) {
                            console.error('Error saving user to database:', err);
                            res.send('Error registering user.');
                        }
                        else {
                            result = 'Hello '+ req.sanitize(req.body.first) + ' '+ req.body.last +' you are now registered!  We will send an email to you at ' + req.body.email;
                            result += 'Your password is: '+ req.body.password +' and your hashed password is: '+ hashedPassword;
                            res.send(result);
                        }
                    });
            
                }  
            });
        }                                                                      
    }); 

    app.get('/login', function (req,res) {
        res.render('login.ejs', shopData);                                                                     
    });  
    
    app.post('/loggedin', function (req,res) {
        const username = req.body.username;
        const password = req.body.password;    
        
        //Query the database to retrieve the hashed password for the provided username
        db.query('SELECT hashedPassword FROM users WHERE username = ?' , [username], (err, results) => {
            if (err) {
                console.error('Error querying the database:', err);
                res.send('Error occured during login.');
            }
            else {
                if (results.length === 0) {
                    res.send('Login failed: User not found.');
                }
                else {
                    //accesses the first (and in this case, the only) element in the results array. Since we are querying the database for a specific username, we expect only one row of data to be returned.
                    const hashedPassword = results[0].hashedPassword;

                    //Compare the provided password with the hashed password from the database
                    bycrypt.compare(password, hashedPassword, function (err, result) {
                        if (err) {
                            console.log('Error comparing passwords:', err);
                            res.send('Error occured during login.');
                        }
                        else if (result === true) {
                            // Save user session here, when login is successful
                            req.session.userId = req.body.username;
                            //Successful login
                            res.send('Login successful!');
                        }
                        else {
                            //Incorrect password
                            res.send('Login failed: Incorrect password.');
                        }
                    });
                }
            }
        })
    }); 

    app.get('/logout', redirectLogin, (req,res) => {
        req.session.destroy(err => {
        if (err) {
          return res.redirect('./')
        }
        res.send('you are now logged out. <a href='+'./'+'>Home</a>');
        })
    })


    app.get('/listusers', function(req, res) {
        // Fetch user data from the database
        db.query('SELECT username, first_name, last_name, email FROM users' , (err, result) => {
            if (err) {
                console.error('Error fetching user data:', err);
                res.redirect('./');
            }
            else {
                let userData = Object.assign({}, shopData, {availableUsers:result}); 
                console.log(userData);
                res.render('listusers.ejs', userData)
            }
        });
    });
        
    app.get('/list', redirectLogin, function(req, res) {
        let sqlquery = "SELECT * FROM books"; // query database to get all the books
        // execute sql query
        db.query(sqlquery, (err, result) => {
            if (err) {
                res.redirect('./'); 
            }
            let newData = Object.assign({}, shopData, {availableBooks:result});
            console.log(newData)
            res.render("list.ejs", newData)
         });
    });

    app.get('/deleteuser', function (req,res) {
        res.render('deleteuser.ejs', shopData);                                                                     
    });  

    app.post('/deleted', function(req, res) {
        const usernameToDelete = req.body.username;

        // Delete the user from the database
        db.query('DELETE FROM users WHERE username = ?', [usernameToDelete], (err, result) => {
            if (err) {
                console.error('Error deleting user:', err);
                res.send('Error deleting user.');
            } else {
                console.log(`User ${usernameToDelete} deleted successfully.`);
                // Redirect to the listusers page to see the updated user list
                res.render('deleteuser.ejs');
            }
        });
    });
    
    app.get('/addbook', function (req, res) {
        res.render('addbook.ejs', shopData);
     });
 
    app.post('/bookadded', function (req,res) {
        // saving data in database
        let sqlquery = "INSERT INTO books (name, price) VALUES (?,?)";
        // execute sql query
        let newrecord = [req.body.name, req.body.price];
        db.query(sqlquery, newrecord, (err, result) => {
            if (err) {
            return console.error(err.message);
            }
            else
            res.send(' This book is added to database, name: '+ req.body.name + ' price '+ req.body.price);
            });
    });    

    app.get('/bargainbooks', function(req, res) {
        let sqlquery = "SELECT * FROM books WHERE price < 20";
        db.query(sqlquery, (err, result) => {
            if (err) {
             res.redirect('./');
          }
          let newData = Object.assign({}, shopData, {availableBooks:result});
          console.log(newData)
          res.render("bargains.ejs", newData)
        });
    });    
    
    app.get('/weather', function (req, res) {
        const request = require('request');
        const apiKey = 'c4ebc646021d792cc40c8685ca3ffda9';
        const city = req.query.city || 'London'; // Use the provided city or default to London
        const url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;

        request(url, function (error, response, body) {
            if (error) {
                console.error('Error:', error);
                res.render('weather.ejs', { weatherData: null });
            } else {
                try {
                    const weather = JSON.parse(body);

                    if (weather !== undefined && weather.main !== undefined) {
                        const weatherData = {
                            name: weather.name,
                            main: {
                                temp: weather.main.temp,
                                humidity: weather.main.humidity,
                            },
                            wind: {
                                speed: weather.wind.speed,
                                deg: weather.wind.deg,
                            },
                        };
                        res.render('weather.ejs', { weatherData });
                    } else {
                        res.render('weather.ejs', { weatherData: null, errorMessage: "No data found" });
                    }
                } catch (parseError) {
                    console.error('Error parsing weather data:', parseError);
                    res.render('weather.ejs', { weatherData: null, errorMessage: "Error parsing weather data" });
                }
            }
        });
    });

    app.get('/api', function (req,res) {

        // Query database to get all the books
        let sqlquery = "SELECT * FROM books"; 

        // Execute the sql query
        db.query(sqlquery, (err, result) => {
            if (err) {
                res.redirect('./');
            }
            // Return results as a JSON object
            res.json(result); 
        });
    });


}

/*
can add validations using isEmpty(), isInt(), and isLength() from Express Validator.

1.
app.post('/registered', [
  // Validate email
  check('email').isEmail(),
  // Validate password length
  check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  // Validate other fields (username, first_name, last_name, etc.)
  check('username').notEmpty().withMessage('Username is required'),
  check('first').notEmpty().withMessage('First name is required'),
  check('last').notEmpty().withMessage('Last name is required'),
], function (req, res) {
  // ... (existing code)
});


2.
app.post('/bookadded', [
  // Validate book name and price
  check('name').notEmpty().withMessage('Book name is required'),
  check('price').isNumeric().withMessage('Price must be a number'),
], function (req, res) {
  // ... (existing code)
});


3.
app.get('/search-result', function (req, res) {
  // Validate search keyword
  check('keyword').notEmpty().withMessage('Search keyword is required'),
  // ... (existing code)
});


4.
app.post('/deleted', [
  // Validate username to delete
  check('username').notEmpty().withMessage('Username to delete is required'),
], function (req, res) {
  // ... (existing code)
});


5.
app.post('/loggedin', [
  // Validate username and password for login
  check('username').notEmpty().withMessage('Username is required'),
  check('password').notEmpty().withMessage('Password is required'),
], function (req, res) {
  // ... (existing code)
});
*/