const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const User = require("../models").users;

module.exports = (passport) => {
  const opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
  opts.secretOrKey = process.env.PASSPORT_SECRET;

  passport.use(
    new JwtStrategy(opts, async function (jwt_payload, done) {
      try {
        const foundUser = await User.findOne({
          where: { employee: jwt_payload.employee },
        });
        return foundUser ? done(null, foundUser) : done(null, false);
      } catch (e) {
        return done(e, false);
      }
    })
  );
};
