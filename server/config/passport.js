var passport = require("passport");
var GoogleStrategy = require("passport-google-oauth2").Strategy;
const User = require("../models/user");
const Token = require("../models/token");
const bcrypt = require("bcrypt");
const config = require("./key");

passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});


//구글 로그인
passport.use(
  new GoogleStrategy(
    {
      clientID: config.client_id,
      clientSecret: config.client_secret,
      callbackURL: "/auth/google/callback",
      passReqToCallback: true,
    },
    async function (req, accessToken, refreshToken, profile, done) {

      try {
        const exUser = await User.findOne({
          where: {
            email: profile.emails[0].value,
            provider: "google",
          },
        });
        if (exUser) {
          const exToken = await Token.findOne({
            where: { user_id: exUser.id },
          });

          if (exToken) {
            await Token.update(
              { accessToken: accessToken },
              { where: { user_id: exUser.id } }
            );
            //console.log("token updated");
            return done(null, exUser, exToken);
          } else {
            const googleToken = await Token.create({
              accessToken: accessToken,
              user_id: exUser.id,
            });
            return done(null, exUser, googleToken);
          }
        } else {
          const hashedPassword = await bcrypt.hash(profile.displayName, 11);
          const newUser = await User.create({
            email: profile.emails[0].value,
            password: hashedPassword,
            nickname: profile.displayName,
            sns_id: profile.id,
            provider: "google",
          });
          const googleToken = await Token.create({
            accessToken: accessToken,
            user_id: newUser.id,
          });
          done(null, newUser, googleToken);
        }
      } catch (err) {
        console.error(err);
        done(err);
      }
      
    }
  )
);

module.exports = passport;
