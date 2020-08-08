require('dotenv').config()


const path = require('path');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const ejs = require("ejs");
const passport = require("passport");
const mongoose = require("mongoose");
const session = require("express-session")
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
let errorList= [];
const findOrCreate = require('mongoose-findorcreate');
var LocalStrategy = require('passport-local').Strategy;

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  removePassword,
  checkPassword,
  passwordList,
  users,
  checkIfPresent
} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
var personName = 'anonymous';
var flash=require("connect-flash");
app.use(flash());
app.use(bodyParser.urlencoded({extended: true}));

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');

const botName = 'Chatsify';

let username,room,password,personId;

const passwordValidator = require('password-validator');
const { request } = require('https');
// const { serializeUser } = require('passport');
var schema = new passwordValidator();
schema
.is().min(5)                                 
.is().max(10)                                  
.has().uppercase()                        
.has().lowercase()                                                            
.has().not().spaces();


app.use(session({
  secret :"Something that should not be here.",
  resave :false,
  saveUninitialized :false


}));
app.use(passport.initialize());
app.use(passport.session());



mongoose.connect("mongodb://localhost:27017/userDB", {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  });
mongoose.set("useCreateIndex",true);
const userSchema = new mongoose.Schema ({
  email: String,
  name: String,
  googleId: String,
  facebookId:String,
  password : String
  
})
const emailSchema = {
  email: String
}
var options = {
  errorMessages: {
      MissingPasswordError: 'No password was given',
      AttemptTooSoonError: 'Account is currently locked. Try again later',
      TooManyAttemptsError: 'Account locked due to too many failed login attempts',
      NoSaltValueStoredError: 'Authentication not possible. No salt value stored',
      IncorrectPasswordError: 'Password or username are incorrect',
      IncorrectUsernameError: 'Password or username are incorrect',
      MissingUsernameError: 'No username was given',
      UserExistsError: 'A user with the given username is already registered'
  }
};
userSchema.plugin(passportLocalMongoose,options);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User",userSchema);
const Email = new mongoose.model("Email",emailSchema);

passport.use(User.createStrategy());
passport.use(new LocalStrategy(User.authenticate()));


passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:8000/auth/google/chatsifi"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id,name:profile.displayName }, function (err, user) {
    personName = profile.displayName;
    return cb(err, user);
  });
}
));

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/chatsifi', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/chat-form');
  });
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "http://localhost:8000/auth/facebook/chatsifi",
  profileFields: ['id', 'displayName', 'email']
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  User.findOrCreate({ facebookId: profile.id,name: profile.displayName }, function (err, user) {
    personName = profile.displayName;
    return cb(err, user);
  });
}
));
app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/chatsifi',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/chat-form');
  });


app.get("/login",(req,res)=> {
  if(req.isAuthenticated()){
    res.redirect("/chat-form")
  }
  else{
    res.render("login",{text:''});
  }
})
app.get("/register",(req,res)=> {
  res.render("register",{errorList:[]});
})

// app.post("/login",(req,res)=>{
//   const user = new User({
//     username : req.body.username,
//     password : req.body.password
//   });
//   // const username = req.body.username;

//   req.login(user,(err)=>{
//     if(!err){


      
//       passport.authenticate("local")(req,res,function(){
     
//         res.redirect("/chat-form")
//       })
//     }
//     else{
//       console.log(err);
//     }
  
//       // res.render("login",{text:"Wrong Password or Email."});
//       // console.log(err);
  
//   })

// })
// app.post('/login', 
//   passport.authenticate('local', { failureRedirect: '/login',failureFlash:'Invalid username or password.'}),
//   function(req, res) {
   
//     res.redirect('/chat-form');
//   });

app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err); }
    if (!user) { 
      console.log("incorrect");
      return res.render('login',{text:"Incorrect Password or Email ."}); 
    }
    req.logIn(user, function(err) {
      if (err) { next(err); }
      User.findOne({username : req.body.username},(err,found)=>{
        if(found){
          personName = found.name;
          personId = found._id;
          console.log(personId);
        }
        else{
          console.log("not found");
        }
      });
     return res.redirect('/chat-form');
    });
  })(req, res, next);
});

// app.post('/login',
//   passport.authenticate('local', { successRedirect: '/',
//                                    failureRedirect: '/login',
//                                    failureFlash: true })
// );

app.post("/register",(req,res)=>{
  const pass = req.body.password;
  const strength = schema.validate(req.body.password);

  if(strength){

  User.register({username:req.body.username,name: req.body.name},pass,(err , user)=>{

    if(err){
      console.log(err);
      errorList = [];
      const error = err.message.replace("username","email");
      errorList.push(error);
      res.render("register",{errorList : errorList});

      // res.redirect("/register");
    }
    else{
      passport.authenticate("local")(req,res,function(){
        personName = req.body.name;
        res.redirect("/chat-form");
      })
    }
  })
  
}
else{
  errorList =[];

  const errors =   schema.validate(pass, { list: true });
   if(errors.includes('min')){
     errorList.push("Maximum 10 chars");
   }
   if(errors.includes('max')){
     errorList.push("Maximum 10 chars");
   }
   if(errors.includes("uppercase")){
    errorList.push("Uppercase must be enabled");
   }
   if(errors.includes("spaces")){
    errorList.push("There should be no space");
   }

   res.render("register",{errorList : errorList});
}
})





app.get("/",(req,res)=>{
  res.render("homepage",{text : ''});
})

app.post("/email-sub",(req,res)=>{
  const emailRes = req.body.email;
  const email = new Email({
    email : emailRes
  })
  email.save((err,doc)=>{
    if(err){
      console.log(err);
    }
    else{
      res.render("homePage",{text: 'Thanks for Subscribing'});
    }
  });
  console.log("saved");


})


app.get("/logout",(req,res)=>{
  req.logout();
  res.redirect("/");
})


app.get("/chat-form",(req,res)=>{
  if(req.isAuthenticated()){

    res.render("index",{errorList : [],name:personName});
  }else{
    res.redirect("/login");
  }

})


app.post("/chat-room",(req,res)=>{
  username = req.body.username;
  const passwordGiven = req.body.password;
  schema
  .is().min(5)                                 
  .is().max(10)                                  
  .has().uppercase()                        
  .has().lowercase()                                                            
  .has().not().spaces();

  room = req.body.room;
  const strength = schema.validate(passwordGiven);

  if(strength){
    password = passwordGiven;
    
    if( checkPassword(room,password,personId)){
      errorList = [];
      res.render("chat");
    }
    else{
      errorList.push('Wrong Password or the room has been already activated.Try another combination');
      // res.redirect("/");
      res.render("index",{errorList : errorList,name:personName});

    }

  }
  else{
    errorList =[];
   const errors =   schema.validate(passwordGiven, { list: true });
   if(errors.includes('min')){
     errorList.push("Minimum 5 Chars");
   }
   if(errors.includes('max')){
     errorList.push("Maximum 10 chars");
   }
   if(errors.includes("uppercase")){
    errorList.push("Uppercase must be enabled");
   }
   if(errors.includes("spaces")){
    errorList.push("There should be no space");
   }

   res.render("index",{errorList : errorList,name:personName});
  
  }

})
app.get("/chat-room",(req,res)=>{
 
  res.redirect("/chat-form");


})


// Run when client connects
io.on('connection', socket => {

  
  const isCorrect = checkPassword(room,password,personId);
  // console.log(isCorrect);

  socket.on('joinRoom', () => {

    


     if(isCorrect){
      const user = userJoin(socket.id, username, room,password);
    socket.join(user.room);
          // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to ChatCord!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });

     }

    else{
       socket.disconnect();
       socket.emit("wrong-pswd",'PassWord is incorrect');
     }
    

  });
    // Listen for chatMessage
    socket.on('chatMessage', msg => {
      const user = getCurrentUser(socket.id);
      if(user){
        
      socket.broadcast.to(user.room).emit('message', formatMessage(user.username, msg));
      socket.emit('internalMessage', formatMessage(user.username, msg));
      }
    });
  
    socket.on('disconnect',()=>{
      const leaver = userLeave(socket.id);
      if(leaver){
      io.to(leaver.room).emit('message',formatMessage(botName,`${leaver.username} has left the chat`));
      io.to(leaver.room).emit('roomUsers', {
        room: leaver.room,
        users: getRoomUsers(leaver.room)
      });
      // console.log(getRoomUsers(leaver.room),passwordList,users);
      const pass_users_count =  getRoomUsers(leaver.room);
        if(users.length === 0){
          console.log("remove");
          removePassword(leaver.room);
      console.log(getRoomUsers(leaver.room),passwordList,users);

          // 
        }
      }

    })

});




app.get("/:params",(req,res)=>{
  res.render("wrong_page");
})
app.get("/register/:params",(req,res)=>{
  res.render("wrong_page");
})
app.get("/login/:params",(req,res)=>{
  res.render("wrong_page");
})
app.get("/chat-form/:params",(req,res)=>{
  res.render("wrong_page");
})
app.get("/chat-room/:params",(req,res)=>{
  res.render("wrong_page");
})

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
