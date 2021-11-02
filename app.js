//jshint esversion:6
require("dotenv").config();
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose=require("mongoose");
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy=require("passport-google-oauth20");
const findOrCreate=require("mongoose-findOrCreate");



const app=express();
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.set("view engine","ejs");
app.use(session({
  secret:"A very long string",
  resave:false,
  saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser:true, useUnifiedTopology:true, useCreateIndex:true});

const userSchema=mongoose.Schema({
  email:String,
  password:String,
  googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User=mongoose.model("User", userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID:process.env.CLIENT_ID,  //informatia din fila .env preluata cand am inregistrat in google developer
    clientSecret:process.env.CLIENT_SECRET,  //idem sus
    callbackURL: "http://localhost:3000/auth/google/secrets"   //Authorized redirect Url din consola google
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/secrets", function(req,res){
  if(req.isAuthenticated()){
    res.render("secrets");
  }else{
    res.redirect("/login");

  }
});

app.get("/auth/google",
  passport.authenticate("google" , {scope:["profile"]}));

  app.get('/auth/google/secrets',
   passport.authenticate('google', { failureRedirect: '/login' }),
   function(req, res) {
     // Successful authentication, redirect tp secrets page.
     res.redirect('/secrets');
   });

app.get("/" , function(req,res){
  res.render("home");
});

app.get("/register" , function(req,res){
  res.render("register");
});

app.get("/login" , function(req,res){
  res.render("login");
});



app.post('/register', function(req,res){
User.register({username:req.body.username}, req.body.password, function(err,user){
  if(err){
    console.log(err);
    res.redirect("/register");
  }else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  }
});
});


app.post("/login", function(req,res){
const user=new User({
  username:req.body.username,
  password:req.body.password
});
req.login(user, function(err){
  if(err){
    console.log(err);
  }else{
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    });
  }
});

});

app.get("/logout", function(req,res){
  req.logout();
  res.redirect("/");
});

app.listen(process.env.PORT || 3000, function(req,res){
  console.log("Server started on port 3000");
});
