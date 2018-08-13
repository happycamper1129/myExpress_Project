const assert = require('assert');
const PassThrough = require('stream').PassThrough;
const util = require('util');
const helpers = require('yeoman-test');
const adminHelper = require('../../common/admin-helper')();
const idGen = require('uuid62');
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:users:create';

describe('eg users create', () => {
  let program, env, username;

  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
    username = idGen.v4();
  });

  afterEach(() => {
    env.resetHijack();
  });

  it('creates a user from prompts', done => {
    env.hijack(namespace, generator => {
      let output, text;

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.log.ok = message => {
          text = message;
        };
        generator.stdout = message => {
          output = message;
        };

        helpers.mockPrompt(generator, {
          username,
          firstname: 'La',
          lastname: 'Deeda'
        });
      });

      generator.once('end', () => {
        const stdOutUser = JSON.parse(output);
        return adminHelper.admin.users.info(username)
          .then(user => {
            assert.strictEqual(user.username, username);
            assert.strictEqual(user.firstname, 'La');
            assert.strictEqual(user.lastname, 'Deeda');

            assert.strictEqual(text, 'Created ' + user.id);

            assert.strictEqual(stdOutUser.username, username);
            assert.strictEqual(stdOutUser.firstname, 'La');
            assert.strictEqual(stdOutUser.lastname, 'Deeda');

            done();
          }).catch(done);
      });
    });

    env.argv = program.parse('users create');
  });

  it('creates a user from properties', done => {
    env.hijack(namespace, generator => {
      let output = null;
      let text = null;

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.log.ok = message => {
          text = message;
        };
        generator.stdout = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        const stdOutUser = JSON.parse(output);
        return adminHelper.admin.users.info(username)
          .then(user => {
            assert.strictEqual(user.username, username);
            assert.strictEqual(user.firstname, 'La');
            assert.strictEqual(user.lastname, 'Deeda');
            assert.strictEqual(text, 'Created ' + user.id);

            assert.strictEqual(stdOutUser.username, username);
            assert.strictEqual(stdOutUser.firstname, 'La');
            assert.strictEqual(stdOutUser.lastname, 'Deeda');

            done();
          }).catch(done);
      });
    });

    env.argv = program.parse('users create -p "username=' + username + '" ' +
      '-p "firstname=La" -p "lastname=Deeda"');
  });

  it('creates a user from stdin', done => {
    const user = { username, firstname: 'La', lastname: 'Deeda' };

    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          output = message;
        };
        generator.log.ok = message => {
          output = message;
        };

        generator.stdin = new PassThrough();
        generator.stdin.write(JSON.stringify(user), 'utf8');
        generator.stdin.end();
      });

      generator.once('end', () => {
        return adminHelper.admin.users.info(username)
          .then(user => {
            assert.strictEqual(user.username, username);
            assert.strictEqual(user.firstname, 'La');
            assert.strictEqual(user.lastname, 'Deeda');
            assert.strictEqual(output, 'Created ' + username);
            done();
          }).catch(done);
      });
    });

    env.argv = program.parse('users create --stdin');
  });

  it('prints only the user id when using the --quiet flag', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        return adminHelper.admin.users.info(username)
          .then(user => {
            assert.strictEqual(user.username, username);
            assert.strictEqual(user.firstname, 'La');
            assert.strictEqual(user.lastname, 'Deeda');

            assert.strictEqual(output, user.id);
            done();
          });
      });
    });

    env.argv = program.parse('users create -p "username=' + username + '" ' +
      '-p "firstname=La" -p "lastname=Deeda" -q');
  });

  it('prints error on invalid username from stdin', done => {
    const user = {
      firstname: 'Clark',
      lastname: 'Kent'
    };

    env.hijack(namespace, generator => {
      let output = null;
      let error = null;

      generator.once('run', () => {
        generator.stdout = message => {
          output = message;
        };
        generator.log.error = message => {
          error = message;
        };
        generator.log.ok = message => {
          output = message;
        };

        generator.stdin = new PassThrough();
        generator.stdin.write(JSON.stringify(user), 'utf8');
        generator.stdin.end();
      });

      generator.once('end', () => {
        assert.strictEqual(error, 'data should have required property \'username\'');
        assert.strictEqual(output, null);

        done();
      });
    });

    env.argv = program.parse('users create --stdin');
  });

  it('prints an error on invalid property syntax', done => {
    env.hijack(namespace, generator => {
      let error = null;

      generator.once('run', () => {
        generator.log.error = (format, ...args) => {
          error = util.format(format, ...args);
        };
      });

      generator.once('end', () => {
        assert.strictEqual(error, 'invalid property option: username=');
        done();
      });
    });

    env.argv = program.parse('users create -p "username=" ' +
      '-p "firstname=La" -p "lastname=Deeda"');
  });
});
