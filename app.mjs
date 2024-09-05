import './config.mjs';
import './db.mjs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import GoogleStrategy from 'passport-google-oauth2';
import passport from 'passport';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'
import esc from 'escape-string-regexp';
import axios from 'axios';

const app = express();
const server = createServer(app);
const io = new Server(server);
const User = mongoose.model('User')
const Pet = mongoose.model('Pet')
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessionMiddleware = session({
  secret: process.env.Session_Secret, // Replace with your own secret key
  resave: false,
  saveUninitialized: true
});
io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.locals.username = req.session.username
  next()
});
function loggedIn(req, res, next) {
  req.session.username ? next() : res.sendStatus(401);
}
async function chosen(req, res, next){
  //var page;
  const user = await User.findOne({ username: new RegExp(`^${esc(req.session.username)}$`, 'i') });
  if (user.pets){
    if (exists(req.session.username)){
      res.redirect('battle');
    } else{
      next();
    }
  } else{
    res.redirect('choose');
  }
}

app.get('/', async (req, res) => {
  if (req.session.username) {
    console.log('user found');
    const user = await User.findOne({ username: new RegExp(`^${esc(req.session.username)}$`, 'i') });
    if (user.pets) { 
      console.log('pets');
      if (exists(req.session.username)){
        res.redirect('battle');
      } else if (user.pets.length == 1){
        console.log(user.pets);
        res.redirect(`/pet/${user.pets[0]._id}`);
      } else if (user.pets.length == 0){
        console.log('no pets');
        res.redirect('choose');
      } else if (user.pets.length > 1) {
        console.log(user.pets);
        res.render('home');
      }
    } 
  } else {
    console.log('user not found')
    res.redirect('login');
  }
});
app.get('/pet/:id', loggedIn, chosen, async (req, res) => {
  try {
    const petId = req.params.id;
    const pet = await Pet.findById(petId);
    res.render('pet', { pet });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/feed', loggedIn, chosen, async (req, res) => {
  const user = await User.findOne({ username: new RegExp(`^${esc(req.session.username)}$`, 'i') });
  const pet = await Pet.findById(user.pets[0]);
  res.render('feed', { pet });
});
app.post('/feed', loggedIn, chosen, async (req, res) => {
  const food = req.body.food;
  const user = await User.findOne({ username: new RegExp(`^${esc(req.session.username)}$`, 'i') });
  const pet = await Pet.findById(user.pets[0]);
  pet.stats.strength += 10;
  await pet.save();
  res.redirect('/');
});
app.get('/play', loggedIn, chosen, async (req, res) => {
  const user = await User.findOne({ username: new RegExp(`^${esc(req.session.username)}$`, 'i') });
  const pet = await Pet.findById(user.pets[0]);
  res.render('play', { pet });
});
app.post('/play', loggedIn, chosen, async (req, res) => {
  const food = req.body.play;
  const user = await User.findOne({ username: new RegExp(`^${esc(req.session.username)}$`, 'i') });
  const pet = await Pet.findById(user.pets[0]);
  pet.stats.health += 10;
  await pet.save();
  res.redirect('/');
});
app.get('/challenge', loggedIn, chosen, async (req, res) => {
  const pet = req.query.pet;
  res.render('challenge', { pet });
});
app.post('/challenge', loggedIn, chosen, async (req, res) => {
  const user = await User.findOne({ username: new RegExp(`^${esc(req.body.username)}$`, 'i') });
  if (user) {
    io.to(users.get(req.body.username)).emit('challengeFrom', {username: req.session.username, pet: req.body.pet});
  } else {
    res.render('challenge', { error: 'User not found' });

  }
  res.redirect('/');
});
app.get('/choose', async (req, res) => {
  try {
    var img1 = await axios.get('https://api.capy.lol/v1/capybara?json=true');
    var img2 = await axios.get('https://api.capy.lol/v1/capybara?json=true');
    var img3 = await axios.get('https://api.capy.lol/v1/capybara?json=true');

    img1 = img1.data.data.url;
    img2 = img2.data.data.url;
    img3 = img3.data.data.url;
   
  } catch (error) {
    console.error('Error fetching random Capybara image:', error);
  }
  res.render('choose', {'img1': img1, 'img2': img2, 'img3': img3});
});
app.post('/choose', loggedIn, async (req, res) => {
  const selectedOption = req.body.selectedOption;
  if (!selectedOption) {
    res.render('choose', { error: 'Select a Capybara' });
  } else {

    const petName = req.body.petName;
    const user = await User.findOne({ username: new RegExp(`^${esc(req.session.username)}$`, 'i') });
    const newPet = new Pet({
      name: petName,
      color: selectedOption,
      stats: {
        strength: 5,
        health: 50,
      },
      needs: {
        feeding: false,
        playing: false,
      },
    });
    await newPet.save();
    console.log(newPet._id);
    if (user.pets) {
      console.log("exists")
      user.pets.push(newPet._id);
    }
    else {
      user.pets = [newPet._id]
    }
    await user.save();
    res.redirect('/');
  }
});
app.get('/login', (req, res) => {
  if(req.session.username){
    res.redirect('/');
  }else {
    res.render('login');
  }
});
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username: new RegExp(`^${esc(username)}$`, 'i') });
  if (user) {
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
      req.session.username = username;
      res.redirect('/');
    } else {
      res.render('login', { error: 'Invalid username or password' });
    }
  } else {
    res.render('login', { error: 'Invalid username or password' });
  }
});
app.get('/register', (req, res) => {
  if(req.session.username){
    res.redirect('/');
  }else {
    res.render('register');
  }
});
app.post('/register', async (req, res) => {
  const user = await User.findOne({ username: new RegExp(`^${esc(req.body.username)}$`, 'i') });
  let registrationSuccess = true;
  try {
    if (user) {
      res.render('register', { error: 'Username is Taken' });
      console.log("duplicate user");
      registrationSuccess = false;
    } else {
      try {
        if (req.body.password.length > 7) {
          const saltRounds = 10; // You can adjust this value for the desired hashing strength
          const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
          const u = new User({
            username: req.body.username,
            password: hashedPassword,
            pets: [],
          });
          console.log("saving...");
          const savedUser = await u.save();
          req.session.username = savedUser.username
          console.log('User saved:', savedUser);
        } else {
          res.render('register', { error: 'Password is too short - Must be 8 characters' });
          console.log("password too short");
          registrationSuccess = false;
        }
      } catch (error) {
        registrationSuccess = false;
        if (error.errors && error.errors.username && error.errors.username.kind === 'minlength') {
          // Handle the "too short" error and display a message to the user
          res.render('register', { error: 'Username is too short - Must be 3 characters' });
          console.log("username too short");
        } else {
          // Handle other validation errors or general errors
          res.render('register', { error: 'Unable to register' });
          console.log("cannot register");
        }
      }
    }
  } catch (e) {
    res.render('register', { error: 'Database unable to register user' });
    console.log("Database cannot register");
    registrationSuccess = false; 
    console.error(e);
  }
  console.log(registrationSuccess);
  if (registrationSuccess) {
    res.redirect('/');
  }
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['email', 'profile'] })
);

app.get('/auth/callback',
  passport.authenticate('google', { successRedirect: '/auth/google/save', failureRedirect: '/auth/failure', }),
);

app.get('/auth/google/save', async (req, res) => {
  try {
    // Check if the user exists based on Google profile data
    const existingUser = await User.findOne({ gid: req.user.id });
    if (existingUser) {
      // If the user exists, log them in by returning the user
      req.session.username = existingUser.username;
      res.redirect('/');
    } else {
      res.render('username');
    }
  } catch (error) {
    res.redirect('/auth/failure');
  }
});

app.post('/auth/google/save', async (req, res) => {
  const user = await User.findOne({ username: new RegExp(`^${esc(req.body.username)}$`, 'i') });
  let registrationSuccess = true;
  try {
    if (user) {
      res.render('username', { error: 'Username is Taken' });
      console.log("duplicate user");
      registrationSuccess = false;
    } else {
      try {
        if (req.body.username.length >= 3) {
          const u = new User({
            username: req.body.username,
            password: 'xgooglex',
            gid: req.user.id,
          });
          const savedUser = await u.save();
          req.session.username = savedUser.username
          console.log('User saved:', savedUser);
        } else {
          res.render('username', { error: 'Username is too short - Must be 3 characters' });
          console.log("Username too short");
          registrationSuccess = false;
        }
      } catch (error) {
        registrationSuccess = false;
        if (error.errors && error.errors.username && error.errors.username.kind === 'minlength') {
          // Handle the "too short" error and display a message to the user
          res.render('username', { error: 'Username is too short - Must be 3 characters' });
          console.log("username too short");
        } else {
          // Handle other validation errors or general errors
          res.render('username', { error: 'Unable to register' });
          console.log("cannot register");
        }
      }
    }
  } catch (e) {
    // Handle registration errors (e.g., database connection issues)
    res.render('username', { error: 'Database unable to register user' });
    console.log("Database cannot register");
    registrationSuccess = false;
    console.error(e);
  }
  // Conditionally display the error message based on the registration success flag
  if (registrationSuccess) {
    res.redirect('/');
  }
});

app.get('/auth/failure', (req, res) => {
  res.render('error', { error: 'An error occurred while signing up with Google' });
});

app.get('/battle', loggedIn, async (req, res) => {
  // returns username, strength, health, charges, pet name, photo
  if (exists(req.session.username)){
    const oppData = findOpp(req.session.username);
    if (oppData){
      const pet = findPet(req.session.username);
      if (pet){
        const userPet = await Pet.findById(pet);
        const oppPet = await Pet.findById(oppData.pet);
        const battle = findBattle(req.session.username);
        const u = battle.users[req.session.username];
        const o = battle.users[oppData.username];
        let user = {username: req.session.username, name: userPet.name, color: userPet.color, stats: {strength: u.strength, health: u.health}, amount: u.amount};
        let opp = {username: oppData.username, name: oppPet.name, color: oppPet.color, stats: {strength: o.strength, health: o.health}, amount: o.amount};
        console.log(req.session.username + ' has ' + user.name);
        res.render('battle', {user, opp});
      }
    } else {
      res.render('error', { error: 'Could not find an active battle' });
    }
  }else {
    res.render('error', { error: 'Could not find active battle' });
  }
});

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

passport.use(new GoogleStrategy({
  clientID: process.env.gCID,
  clientSecret: process.env.gSecret,
  callbackURL: "https://mycapybara.club/auth/callback",
  passReqToCallback: true
},
  function (request, accessToken, refreshToken, profile, done) {
    return done(null, profile);
  }
));

function exists(usernameToFind) {
  for (const battle of battles.values()) {
    if (battle.users[usernameToFind]) {
      return true;
    }
  }
  return false;
}

function findOpp(username) {
  //console.log('search battles  ' + battles.values())
  for (const battle of battles.values()) {
    if (battle.users.hasOwnProperty(username)) {
      const otherUsername = Object.keys(battle.users).find(user => user !== username);
      const oppPet = findPet(otherUsername);
      return {
        username: otherUsername,
        pet: oppPet,
      };
    }
  }
}

function findPet(username) {
  for (const battle of battles.values()) {
    if (battle.users.hasOwnProperty(username)) {
      return battle.users[username].pet;
    }
  }
  return null;
}

function findBattle(username) {
  for (const battle of battles.values()) {
    if (battle.users.hasOwnProperty(username)) {
      return battle;
    }
  }
  return null;
}

function findBattleID(username) {
  for (const [battleID, battleData] of battles.entries()) {
    const users = battleData.users;
    if (users.hasOwnProperty(username)) {
      return battleID;
    }
  }
  return null;
}

let users = new Map();
// username: sock.id
var battles = new Map();
let battleID = 1;

io.on('connect', (sock) => {
  const session = sock.request.session;
  console.log(session.username + " connected");
  if (session.username) {
    users.set(session.username, sock.id);
  }
  console.log(session.username + '  ' + sock.id);
  users.forEach((value, key) => {
    console.log(`    username: ${key}, sock.id: ${value}`);
  });
  battles.forEach((value, key) => {
    console.log(`#: ${key}, data: ${JSON.stringify(value)}`);
  });
  // sock.on('disconnect', () => {
  //   console.log('disconnect');
    
  //   users.delete(session.username);
  //   if(exists(session.username)){
  //     const battle = findBattleID(session.username);
  //     console.log('Found ' + JSON.stringify(battle));
  //     battles.delete(battle);
  //   } else{
  //     console.log('error session does not exist');
  //   }
  //   users.forEach((value, key) => {
  //     console.log(`    username: ${key}, sock.id: ${value}`);
  //   });
  //   battles.forEach((value, key) => {
  //     console.log(`#: ${key}, data: ${JSON.stringify(value)}`);
  //   });
  // });

  sock.on('acceptedChallenge', async (data) => {
    if (!(exists(session.username)) && !(exists(data.username))){
      const userPet = await Pet.findById(data.yourPet);
      const oppPet = await Pet.findById(data.oppPet);
      battles.set(battleID, {users: {[session.username]: {pet: data.yourPet, health: userPet.stats.health, strength: userPet.stats.strength, amount: 0},
                                     [data.username]: {pet: data.oppPet, health: oppPet.stats.health, strength: oppPet.stats.strength, amount: 0}}, turn: 'none'});

      battleID++;
      console.log('accepted');
      io.to(users.get(data.username)).emit('redirect', '/battle');
      io.to(users.get(session.username)).emit('redirect', '/battle');
    }
    
  });
  sock.on('clientRedirect', (data) => {
    io.to(users.get(session.username)).emit('redirect', data);
  });
  sock.on('action', (data) => { 
    let battle = battles.get(sock.bid);
    console.log(data + ' on ' + (users.get(findOpp(session.username).username)));
    
    if (battle.turn == 'none'){
      battle.turn = session.username;
      battle.users[session.username].action = data;
      battles.set(sock.bid, battle);
    } else if (battle.turn != session.username){
      let opp = battle.users[battle.turn];
      let user = battle.users[session.username];
      if((opp.action == 'attack' && data == 'defend') || (opp.action == 'defend' && data == 'attack')){
        if(opp.action == 'attack' && data == 'defend'){
          if(battle.users[battle.turn].amount > 0){
            battle.users[battle.turn].amount--;
          }
        }
        if (opp.action == 'defend' && data == 'attack'){
          if (battle.users[session.username].amount > 0){
            battle.users[session.username].amount--;
          }
        }
      }else{
        switch (opp.action) {
          case 'defend':

            break;
          case 'attack':
            if (battle.users[battle.turn].amount > 0){
              battle.users[session.username].health -= opp.strength;
              battle.users[battle.turn].amount--;    
            }            
            break;
          case 'recharge':
            battle.users[battle.turn].amount++;
            break;
          default:
            console.log('Unknown action');
            break;
        }
        switch (data) {
          case 'defend':

            break;
          case 'attack':
            if (battle.users[session.username].amount > 0){
              battle.users[battle.turn].health -= user.strength;
              battle.users[session.username].amount--;
            }
            break;
          case 'recharge':
            battle.users[session.username].amount++;
            break;
          default:
            console.log('Unknown action');
            break;
        }
      }
      
      const userEmit = {user: battle.users[session.username], opp: battle.users[battle.turn]};
      const oppEmit = {user: battle.users[battle.turn], opp: battle.users[session.username]};
      const oppUsername = battle.turn;
      battle.turn = 'none';
      battles.set(sock.bid, battle);
      io.to(users.get(oppUsername)).emit('battleUpdate', oppEmit);
      io.to(sock.id).emit('battleUpdate', userEmit);
      console.log('sent');
    }
  });
  sock.on('init', (data) => {
    sock.bid = findBattleID(session.username);
    // let battle = battles.get(sock.bid)
    // const opp = findOpp(session.username);
  })
  sock.on('end', (data) => {
    switch (data) {
      case 'forfeit':

        break;
    }
    io.to(users.get(findOpp(session.username).username)).emit('redirect', '/');
    io.to(users.get(session.username)).emit('redirect', '/');
    users.delete(session.username);
    if(exists(session.username)){
      const battle = findBattleID(session.username);
      console.log('Found ' + JSON.stringify(battle));
      battles.delete(battle);
    } else{
      console.log('error session does not exist');
    }
  });
});

server.listen(8080);
//app.listen(8080);