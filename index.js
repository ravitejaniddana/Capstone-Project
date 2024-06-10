const express = require('express');
const app = express();
const port = 4001;
const request = require('request');
const path = require('path');
const bodyParser = require('body-parser');
const axios = require('axios');
app.use(bodyParser.urlencoded({ extended: true }));

// Static files
 app.use(express.static('public'));
 // Load static assets
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

var serviceAccount = require("./key.json");

initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore();

const firebaseConfig = {
    apiKey: "AIzaSyDjYEufGWjegJlWh_TFy2kp38F1HSGk1Go",
    authDomain: "capstone-project-bada1.firebaseapp.com",
    projectId: "capstone-project-bada1",
    storageBucket: "capstone-project-bada1.appspot.com",
    messagingSenderId: "552539829687",
    appId: "1:552539829687:web:10bc8e94646193e4d4e432",
    measurementId: "G-47W4KGNSFQ"
};

app.post('/updates', (req, res) => {
    const email = req.body.email;
  
    db.collection('subscribers').add({
        email: email
    })
    .then((docRef) => {
        console.log('Email subscribed successfully with ID: ', docRef.id);
        res.send('Email subscribed successfully!');
    })
    .catch(error => {
        console.error('Error adding email to Firestore:', error);
        res.status(500).send('Failed to subscribe email.');
    });
});

app.set("view engine", "ejs");

app.get("/login", (req, res) => {
    res.render('login', {titl:"Login"});
});

app.get("/signup", (req, res) => {
    res.render('signup', {titl:"Signup"});
});

app.post('/signupsubmit', (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const conform_password = req.body.conform_password;

    if (password === conform_password) {
        db.collection('users')
            .add({
                username: username,
                email: email,
                password: password,
            })
            .then(() => {
                res.render("login");
            })
            .catch((error) => {
                console.error("Error adding user to Firestore: ", error);
                res.send("Signup Failed: Error saving user to database.");
            });
    } else {
        res.send("Signup Failed: Passwords do not match.");
    }
});

app.get('/loginsubmit', (req, res) => {
    const email = req.query.email; 
    const password = req.query.password;
    db.collection("users")
        .where("email", "==", email)
        .where("password", "==", password)
        .get()
        .then((docs) => {
            if (docs.size > 0) {
                var usersData = [];
                db.collection('users')
                    .get()
                    .then((allDocs) => {
                        allDocs.forEach((doc) => {
                            usersData.push(doc.data());
                        });
                    })
                    .then(() => {
                        console.log(usersData);
                        res.render('index', { userData: usersData, titl: "Dashboard"  });
                    });
            } else {
                res.send("Login Failed: Incorrect email or password.");
            }
        })
        .catch((error) => {
            console.error("Error logging in: ", error);
            res.send("Login Failed: Error checking credentials.");
        });
});


const TMDB_API_KEY = '47a997a619306ca551adc61619e07320';

app.get('/searchmovies', (req, res) => {
    res.render('searchmovies');
});

app.get("/", (req, res) => {
    res.render('index',{titl:"Dashboard"});
});

app.post('/search', async (req, res) => {
    const searchTerm = req.body.searchTerm;
    try {
        const response = await axios.get(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${searchTerm}`);
        const movies = response.data.results;
        res.render('results', { movies, searchTerm });
    } catch (error) {
        res.send('Error retrieving movie data');
    }
});



const languageNameMap = require('language-name-map');

app.get('/searchmovies', async (req, res) => {
    try {
      const response = await axios.get(`https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}`);
      const movies = response.data.results;
      res.render('searchmovies', { movies });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
  

 app.post('/search', async (req, res) => {
    const searchTerm = req.body.searchTerm;
    try {
        const response = await axios.get(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${searchTerm}`);
        const movies = response.data.results;
        res.render('results', { movies, searchTerm });
    } catch (error) {
        res.send('Error retrieving movie data');
    }
});

app.get('/movie/:id', async (req, res) => {
    const movieId = req.params.id;
    const language = req.query.language || 'en-US';
    try {
        const movieResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=${language}`);
        const movie = movieResponse.data;

        const videoResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${TMDB_API_KEY}`);
        const videos = videoResponse.data.results;
        const trailer = videos.find(video => video.type === 'Trailer' && video.site === 'YouTube' && video.iso_639_1 === language);

        const translationsResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}/translations?api_key=${TMDB_API_KEY}`);
        const languages = translationsResponse.data.translations.map(translation => ({
            code: translation.iso_639_1,
            name: languageNameMap[translation.iso_639_1] || translation.iso_639_1
        }));

        const creditsResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`);
        const credits = creditsResponse.data.crew;
        const director = credits.find(member => member.job === 'Director');

        res.render('movietrailer', { 
            movie, 
            trailer, 
            languages, 
            selectedLanguage: language, 
            director: director ? director.name : 'Unknown' 
        });
    } catch (error) {
        console.error('Error retrieving movie details:', error.message);
        res.send('Error retrieving movie details');
    }
});

app.listen(port, () => {
    console.log(`Listening to the port http://localhost:${port}`);
});