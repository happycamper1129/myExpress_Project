let should = require('should');
let config = require('./config.models.js');
let uuid = require('node-uuid');
let services = require('../src/consumers')(config);
let userService = services.userService;
let db = require('../src/db')(config.redis.host, config.redis.port);

describe('User service tests', function () {

  describe('Insert tests', function () {
    before(function(done) {
      db.flushdbAsync()
      .then(function(didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should insert a user', function (done) {
      let user = {
        username: 'irfanbaqui',
        firstname: 'irfan',
        lastname: 'baqui',
        email: 'irfan@eg.com'
      };

      userService
      .insert(user)
      .then(function(newUser) {
        should.exist(newUser.id);
        should.exist(newUser.createdAt);
        should.exist(newUser.username);
        user.username.should.eql(newUser.username);
        db.hgetallAsync(config.users.redis.userHashPrefix.concat(':', newUser.id))
        .then(function(userObj) {
          should.exist(userObj);
          should.exist(userObj.username);
          userObj.username.should.eql(user.username);
          should.exist(userObj.email);
          userObj.email.should.eql(user.email);
          should.exist(userObj.firstname);
          userObj.firstname.should.eql(user.firstname);
          should.exist(userObj.lastname);
          userObj.lastname.should.eql(user.lastname);
          should.exist(userObj.isActive);
          userObj.isActive.should.eql('true');
          should.exist(userObj.createdAt);
          userObj.createdAt.should.eql(newUser.createdAt);
          should.exist(userObj.updatedAt);
          done();
        })
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      })
    });

    it('should throw an error when inserting a user with missing properties', function (done) {
      let user = {
        username: 'irfanbaqui-1',
        lastname: 'baqui',
        email: 'irfan@eg.com'
      };

      userService
      .insert(user)
      .then(function(newUser) {
        should.not.exist(newUser);
      })
      .catch(function(err) {
        should.exist(err);
        err.message.should.eql('firstname is required');
        done();
      });
    });

    it('should throw an error when inserting a user with existing username', function (done) {
      let user = {
        username: 'irfanbaqui',
        firstname: 'irfan',
        lastname: 'baqui',
        email: 'irfan@eg.com'
      };

      userService
      .insert(user)
      .then(function(newUser) {
        should.not.exist(newUser);
      })
      .catch(function(err) {
        should.exist(err);
        err.message.should.eql('username already exists');
        done();
      });
    });
  });

  describe('Get and Find User tests', function () { 
    let user;
    before(function(done) {
      db.flushdbAsync()
      .then(function(didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        user = createRandomUserObject();
        userService
        .insert(user)
        .then(function(newUser) {
          should.exist(newUser);
          user.id = newUser.id;
          done();
        });
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should get user by userId', function (done) {
      userService.get(user.id)
        .then(function(_user) {
          should.exist(_user);
          _user.id.length.should.be.greaterThan(10);
          done();
        })
        .catch(function(err) {
          should.not.exist(err);
          done();
        })
    });

    it('should not get user by invalid userId', function (done) {
      userService.get(uuid.v4())
        .then(function(user) {
          should.exist(user);
          user.should.eql(false);
          done();
        })
        .catch(function(err) {
          should.not.exist(err);
          done();
        })
    });

    it('should find user by username', function (done) {
      userService.find(user.username)
        .then(function(_user) {
          should.exist(_user);
          _user.username.should.eql(user.username)
          _user.id.length.should.be.greaterThan(10);
          done();
        })
        .catch(function(err) {
          should.not.exist(err);
          done();
        })
    });

    it('should not find user by invalid username', function (done) {
      userService.find('invalid_username')
        .then(function(user) {
          should.exist(user);
          user.should.eql(false);
          done();
        })
        .catch(function(err) {
          should.not.exist(err);
          done();
        })
    });
  });

  describe('Update user tests', function() {
    let user, updatedUser;
    before(function(done) {
      db.flushdbAsync()
      .then(function(didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        user = createRandomUserObject();
        userService
        .insert(user)
        .then(function(newUser) {
          should.exist(newUser);
          user.id = newUser.id;
          user.createdAt = newUser.createdAt;
          done();
        });
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should update user', function(done) {
      updatedUser = createRandomUserObject();
      userService.update(user.id, updatedUser)
      .then(function(res) {
        should.exist(res);
        res.should.eql(true);
        return userService.get(user.id)
        .then(function(_user) {
          // should.exist(_user.username);
          // _user.username.should.eql(updatedUser.username);
          should.exist(_user.email);
          _user.email.should.eql(updatedUser.email);
          should.exist(_user.firstname);
          _user.firstname.should.eql(updatedUser.firstname);
          should.exist(_user.lastname);
          _user.lastname.should.eql(updatedUser.lastname);
          should.exist(_user.createdAt);
          _user.createdAt.should.eql(user.createdAt);
          should.exist(_user.updatedAt);
          done();
        })
        .catch(function(err) {
          should.not.exist(err);
          done();
        })
      });
    });

    it('should allow update of any single user property user', function(done) {
      let anotherUpdatedUser = {
        email: 'baq@eg.com'
      };
      userService.update(user.id, anotherUpdatedUser)
      .then(function(res) {
        should.exist(res);
        res.should.eql(true);
        return userService.get(user.id)
        .then(function(_user) {
          // should.exist(_user.username);
          // _user.username.should.eql(updatedUser.username);
          should.exist(_user.email);
          _user.email.should.eql(anotherUpdatedUser.email);
          should.exist(_user.firstname);
          _user.firstname.should.eql(updatedUser.firstname);
          should.exist(_user.lastname);
          _user.lastname.should.eql(updatedUser.lastname);
          should.exist(_user.createdAt);
          _user.createdAt.should.eql(user.createdAt);
          should.exist(_user.updatedAt);
          done();
        });
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      })
    });

    it('should not update user with unvalid id', function(done) {
      let updatedUser = {
        username: 'joecamper', 
        firstname: 'Joe', 
        lastname: 'Camper',
        email: 'joecamper@eg.com'
      };
      userService.update('invalid_id', updatedUser)
      .then(function(res) {
        should.exist(res);
        res.should.eql(false);
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not update user with invalid properties', function(done) {
      let updatedUser = {
        username: 'joecamper', 
        invalid_prop: 'xyz111', 
      };
      userService.update(user.id, updatedUser)
      .then(function(res) {
        should.not.exist(res);
        done();
      })
      .catch(function(err) {
        should.exist(err);
        err.message.should.eql('one or more properties is invalid');
        done();
      });
    });
  });

  describe('Activate and deactivate user tests', function() {
    let user;
    before(function(done) {
      db.flushdbAsync()
      .then(function(didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        user = createRandomUserObject();
        userService
        .insert(user)
        .then(function(newUser) {
          should.exist(newUser);
          user = Object.assign(user, newUser);
          user.createdAt = newUser.createdAt;
          done();
        });
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should deactivate user', function(done) {
      userService.deactivate(user.id)
      .then(function(res) {
        should.exist(res);
        res.should.eql(true);
        return userService.get(user.id)
        .then(function(_user) {
          should.exist(_user.username);
          _user.username.should.eql(user.username);
          should.exist(_user.email);
          _user.email.should.eql(user.email);
          should.exist(_user.firstname);
          _user.firstname.should.eql(user.firstname);
          should.exist(_user.lastname);
          _user.lastname.should.eql(user.lastname);
          should.exist(_user.isActive);
          _user.isActive.should.eql('false');
          should.exist(_user.createdAt);
          _user.createdAt.should.eql(user.createdAt);
          should.exist(_user.updatedAt);
          done();
        })
        .catch(function(err) {
          should.not.exist(err);
          done();
        })
      });
    });

    it('should reactivate user', function(done) {
      userService.activate(user.id)
      .then(function(res) {
        should.exist(res);
        res.should.eql(true);
        return userService.get(user.id)
        .then(function(_user) {
          should.exist(_user.username);
          _user.username.should.eql(user.username);
          should.exist(_user.email);
          _user.email.should.eql(user.email);
          should.exist(_user.firstname);
          _user.firstname.should.eql(user.firstname);
          should.exist(_user.lastname);
          _user.lastname.should.eql(user.lastname);
          should.exist(_user.isActive);
          _user.isActive.should.eql('true');
          should.exist(_user.createdAt);
          _user.createdAt.should.eql(user.createdAt);
          should.exist(_user.updatedAt);
          done();
        })
        .catch(function(err) {
          should.not.exist(err);
          done();
        })
      });
    });
  });

  describe('Delete user tests', function() {
    let user;
    before(function(done) {
      db.flushdbAsync()
      .then(function(didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        user = createRandomUserObject();
        userService
        .insert(user)
        .then(function(newUser) {
          should.exist(newUser);
          user.id = newUser.id;
          done();
        });
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should delete user', function(done) {
      userService.remove(user.id)
      .then(function(deleted) {
        should.exist(deleted);
        deleted.should.eql(true);
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not delete user with invalid id', function(done) {
      userService.remove('invalid_id')
      .then(function(deleted) {
        should.exist(deleted);
        deleted.should.eql(false);
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });
  });
});

function createRandomUserObject() {
  return {
    username: uuid.v4(),
    firstname: uuid.v4(),
    lastname: uuid.v4(),
    email: uuid.v4()
  }
}