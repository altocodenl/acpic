(function () {

   // *** SETUP ***

   var dale = window.dale, teishi = window.teishi, lith = window.lith, c = window.c, B = window.B;
   var type = teishi.t, clog = console.log;

   // *** LOGGING ***

   B.forget ('eventlog');

   B.listen ({id: 'eventlog', verb: '*', path: [], priority: 1}, function (x) {
      B.eventlog.unshift ({verb: x.verb, path: x.path, from: x.from});
      if (arguments.length > 1) B.eventlog [0].args = [].slice.call (arguments, 1);
      if (! B.verbose) return;
      var toprint = ['event #' + B.eventlog.length, B.eventlog [0].verb, B.eventlog [0].path];
      if (dale.keys (B.eventlog [0]).indexOf ('args') > -1) toprint.push (JSON.stringify (B.eventlog [0].args).slice (0, 500));
      if (B.eventlog [0].from [1]) {
         toprint.push ('FROM');
         dale.do (['ev', 'verb', 'path'], function (i) {
            if (B.eventlog [0].from [1].verb && 'ev' === i) return;
            if (B.eventlog [0].from [1] [i]) toprint.push (B.eventlog [0].from [1] [i]);
            if (dale.keys (B.eventlog [0].from [1]).indexOf ('args') > -1) toprint.push (JSON.stringify (B.eventlog [0].from [1].args).slice (0, 500));
         });
      }
      console.log.apply (console, toprint);
   });

   B.prod      = true;
   //B.verbose = true;

   // *** ERROR REPORTING ***

   window.onerror = function () {
      c.ajax ('post', 'error', {}, dale.do (arguments, function (v) {
         return v.toString ();
      }).concat (B.eventlog.slice (0, 5)));
   }

   // *** INITIALIZATION OF STATE/DATA ***

   B.do ({from: {ev: 'initialize'}}, 'set', 'State', {});
   B.do ({from: {ev: 'initialize'}}, 'set', 'Data',  {});

   window.State = B.get ('State'), window.Data = B.get ('Data');

   // *** NAVIGATION ***

   B.listen ('change', 'hash', function (x) {
      var path = window.location.hash.replace ('#/', '').split ('/');
      if (path [0] === 'auth' && path [1] === 'signup' && path [2]) State.token    = path [2];
      if (path [0] === 'auth' && path [1] === 'reset'  && path [2]) State.token    = path [2];
      if (path [0] === 'auth' && path [1] === 'reset'  && path [3]) State.username = path [3];
      if (path [0] === 'auth' && path [1] === 'login'  && path [2] === 'verified') B.do (x, 'notify', 'green', 'You have successfully verified your email address. Please login to start using ac;pic!');
      B.do (x, 'set', ['State', 'view'],    path [0]);
      B.do (x, 'set', ['State', 'subview'], path [1]);
   });

   B.listen ('change', ['State', /view|subview/], function (x) {
      var view = B.get ('State', 'view');
      var cookie = c.cookie () [COOKIENAME];
      if (! cookie && view !== 'auth') return B.do (x, 'set', ['State', 'view'], 'auth');
      if (cookie   && view !== 'main') return B.do (x, 'set', ['State', 'view'], 'main');
      window.location.hash = ['#', B.get ('State', 'view'), B.get ('State', 'subview')].join ('/');
   });

   // *** INITIALIZATION ***

   c.ready (function () {
      B.do ({from: {ev: 'ready'}}, 'change', 'hash');
      B.mount ('body', Views.base ({from: {ev: 'ready'}}));

      window.addEventListener ('hashchange', function () {
         B.do ({from: {ev: 'hashchange'}}, 'change', 'hash')
      });

      document.onscroll = function (e) {
         B.do ({from: {ev: 'onscroll'}}, 'document', 'scroll', e);
      }

      window.onresize = function (e) {
         B.do ({from: {ev: 'onresize'}}, 'change', ['State', 'subview']);
         B.do ({from: {ev: 'onresize'}}, 'change', ['State', 'notify']);
         B.do ({from: {ev: 'onresize'}}, 'change', ['State', 'canvas']);
      }

      document.onbeforeunload = function () {
         var q = B.get ('State', 'upload', 'queue');
         if (q && q.length > 0) return 'Refreshing the page will stop the upload process. Are you sure?';
      }

      dale.do (['webkitfullscreenchange', 'mozfullscreenchange', 'fullscreenchange', 'MSFullscreenChange'], function (v) {
         document.addEventListener (v, function () {
            if (! document.fullscreenElement && ! document.webkitIsFullScreen && ! document.mozFullScreen && ! document.msFullscreenElement) {
               B.do ({ev: 'onkeydown', key: 27}, 'rem', 'State', 'canvas');
            }
         });
      });

      document.onkeydown = function (e) {
         e = e || document.event;
         if (e.keyCode === 16) B.do ({ev: 'onkeydown', key: 16}, 'set', ['State', 'shift'], true);
         if (e.keyCode === 17) B.do ({ev: 'onkeydown', key: 17}, 'set', ['State', 'ctrl'],  true);
         if (e.keyCode === 37) B.do ({ev: 'onkeydown', key: 37}, 'canvas', 'prev');
         if (e.keyCode === 39) B.do ({ev: 'onkeydown', key: 39}, 'canvas', 'next');
      };

      document.onkeyup = function (e) {
         e = e || document.event;
         if (e.keyCode === 16) B.do ({ev: 'onkeyup', key: 16}, 'set', ['State', 'shift'], false);
         if (e.keyCode === 17) B.do ({ev: 'onkeyup', key: 17}, 'set', ['State', 'ctrl'],  false);
      };
   });

   // *** LOGOUT ***

   B.listen ('logout', [], function (x, norequest) {
      var cb = function () {
         B.eventlog = [];
         B.do (x, 'set', 'State', {});
         B.do (x, 'set', 'Data',  {});
         window.State = B.get ('State'), window.Data = B.get ('Data');
         B.do (x, 'set', ['State', 'view'], 'auth');
      }
      if (norequest) return cb ();
      c.ajax ('post', 'auth/logout', {}, {cookie: document.cookie}, function (error) {
         if (error) return B.do (x, 'notify', 'red', 'There was an error logging you out.');
         cb ();
      });
   });

   // *** HELPERS ***

   var H = window.H = {};

   H.css = {
      highlight: '#5B6EFF',
      neutral:   '#D8EEFF',
      selection: '#FFECCC',
      add:       '#CFEFDD',
      remove:    '#FFD3D3',
      good:      '#87D7AB',
      bad:       '#FC201F',
      gray1:     '#3A3A3A',
      gray2:     '#484848',
      gray3:     '#8B8B8B',
      gray4:     '#DEDEDE',
      gray5:     '#F2F2F2',
      gray6:     '#FBFBFB',
      tagc0:     '#FECB5F',
      tagc1:     '#BE5764',
      tagc2:     '#5DE3C2',
      tagc3:     '#8B572A',
      tagc4:     '#6B6DF9',
      tagc5:     '#FA7E5C',
      tagc6:     '#4EDEF8',
      font:      'Montserrat, sans-serif',
   }

   H.icons = {
      tag: function (color) {
         return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21"><g><path fill="' + color + '" stroke="' + color + '" d="M15.75,9.9a1.51,1.51,0,0,0,.34-1.1l-.32-3.51a1.5,1.5,0,0,0-1.62-1.36l-3.51.29a1.5,1.5,0,0,0-1,.54L4.67,10.65a1.51,1.51,0,0,0,.18,2.12L8.68,16a1.51,1.51,0,0,0,2.12-.18Z"/></g></svg>';
      }
   }

   H.if = function (cond, then, Else) {
      return cond ? then : Else;
   }

   H.last = function (a, pos) {
      return a [a.length - (pos || 1)];
   }

   H.from = function (x, o) {
      x.from.unshift (o);
      return x;
   }

   H.authajax = function (x, m, p, h, b, cb) {
      x = H.from (x, {ev: 'authajax', method: m, path: p, headers: h, body: b});
      if (m === 'post') {
         if (type (b, true) === 'formdata') b.append ('cookie', document.cookie);
         else                               b.cookie = document.cookie;
      }
      return c.ajax (m, p, h, b, function (error, rs) {
         if (error && error.status === 403) {
            B.do (x, 'logout', [], true);
            return B.do (x, 'notify', 'red', 'Your session has expired. Please login again.');
         }
         if (error) console.log (error.responseText);
         cb (error, rs);
      });
   }

   H.picpath = function (pic, size) {
      if (! size && pic.t200) return 'thumb/' + pic.t200;
      if (pic.t900) return 'thumb/' + pic.t900;
      return 'pic/' + pic.id;
   }

   H.fullscreen = function (x, exit) {
      // https://www.sitepoint.com/use-html5-full-screen-api/
      // https://stackoverflow.com/a/10082234
      if (! exit) {
         dale.do (['requestFullScreen', 'webkitRequestFullscreen', 'mozRequestFullScreen', 'msRequestFullscreen'], function (v) {
            if (type (document.documentElement [v]) === 'function') document.documentElement [v] ();
         });
         if (window.ActiveXObject) {
            var wscript = new ActiveXObject ('WScript.Shell');
            if (wscript) wscript.SendKeys ('{F11}');
         }
      }
      else {
         dale.do (['exitFullScreen', 'webkitExitFullscreen', 'mozCancelFullScreen', 'msExitFullscreen'], function (v) {
            if (type (document [v]) === 'function') document [v] ();
         });
         if (window.ActiveXObject) {
            var wscript = new ActiveXObject ('WScript.Shell');
            if (wscript) wscript.SendKeys ('{ESC}');
         }
      }
      setTimeout (function () {
         B.do (H.from (x, {ev: 'fullscreen'}), 'set', ['State', 'screen'], {w: window.innerWidth, h: window.innerHeight});
      }, 50);
   }

   H.spaceh = function (cols) {
      var COLS = 40;
      return 100 * cols / COLS + 'vw';
   }

   H.spacev = function (number, lineHeight) {
      var TYPELINEHEIGHT = 1.5;
      return number * (lineHeight || TYPELINEHEIGHT) + 'rem';
   }

   H.fontsize = function (value, ratio, base) {
      var TYPEBASE = 1, TYPERATIO = 1.2;
      return Math.pow (ratio || TYPERATIO, value) * (base || TYPEBASE) + 'rem';
   }

   H.tagsort = function (a, b) {
      if (a.match (/^\d{4}$/) && b.match (/^\d{4}$/)) return parseInt (a) > parseInt (b) ? 1 : -1;
      return a.toLowerCase () < b.toLowerCase () ? -1 : 1;
   }

   H.zp = function (v) {return v < 10 ? '0' + v : v}

   H.dformat = function (d) {
      d = new Date (d);
      return H.zp (d.getUTCDate ()) + '/' + H.zp (d.getUTCMonth () + 1) + '/' + d.getUTCFullYear ();
   }

   H.isyear = function (tag) {
      return tag.match (/^[0-9]{4}$/) && parseInt (tag) >= 1900 && parseInt (tag) <= 2100;
   }

   H.style = function (a, b) {
      var output = arguments.length === 2 ? arguments [0] : {};
      output.style = '';
      dale.do (arguments [arguments.length - 1], function (v, k) {
         if (! v && v !== 0) return;
         var typeV = type (v);
         if (typeV === 'integer' && (v < 0 || v > 1)) v += 'px';
         if (typeV === 'float' || v === 1) v = (v * 100) + '%';
         dale.do (k.split (/,\s*/), function (v2) {
            output.style += v2 + ':' + v + ';';
         });
      });
      return output;
   }

   // *** VIEWS ***

   var Views = {};

   Views.base = function (x) {
      return B.view (x, ['State', 'view'], function (x, view) {
         return [
            Views.notify (x),
            Views [view] ? Views [view] (x) : [],
            ['style', [
               ['html', {
                  'font-size': H.fontsize (0.5),
                  'font-family': 'Montserrat, sans-serif',
               }],
               ['h1', {
                  'font-size':     H.fontsize (3),
                  'margin-bottom': H.spacev (2),
                  'margin-top':    H.spacev (1),
               }],
               ['h2', {
                  'font-size':     H.fontsize (3),
                  'margin-bottom': H.spacev (1),
                  'margin-top':    H.spacev (0.5),
               }],
               ['h5', {
                  'font-size': H.fontsize (-1.5),
               }],
               ['p', {
                  'font-size': H.fontsize (-1),
               }],
               ['.bold', {
                  'font-weight': 'bold',
               }],
               ['.float',  {float: 'left'}],
               ['.floatr', {float: 'right'}],
               ['.pointer', {cursor: 'pointer'}],
               dale.do (['::-webkit-input-placeholder', '::-moz-placeholder', ':-ms-input-placeholder', ':-moz-placeholder'], function (v) {
                  return [v, {
                     'font-style': 'italic',
                  }];
               }),
               ['input:focus, select:focus, textarea:focus, button:focus', {
                  outline: 'none',
               }],
               dale.fil (H.css, undefined, function (v, k) {
                  if (v.match (/^#/)) ['.' + k, {color: v}];
               }),
            ]],
         ];
      });
   }

   // *** NOTIFY ***

   Views.notify = function (x) {
      return B.view (x, ['State', 'notify'], {listen: [
         ['notify', '*', function (x, message, notimeout) {
            if (B.get ('State', 'notify', 'timeout')) clearTimeout (B.get ('State', 'notify', 'timeout'));
            B.do (x, 'set', ['State', 'notify'], {color: x.path [0], message: message});
            if (! notimeout) B.do (x, 'set', ['State', 'notify', 'timeout'], setTimeout (function () {
               B.do (x, 'rem', 'State', 'notify');
            }, 3000));
         }],
      ]}, function (x, notify) {
         if (! notify) return;
         var colormap = {red: '#ff0033'};
         return [
            ['div', B.ev (H.style ({
               position: 'fixed',
               'bottom, left': 0,
               margin: '0 auto',
               color: 'white',
               border: 'solid 4px ' + (colormap [notify.color] || notify.color),
               'background-color': '#333333',
               height: '1.6em',
               width: 1,
               'z-index': '2',
               padding: '0.5em',
               opacity: notify ? 1 : 0,
               'text-align': 'center',
               'font-size': H.fontsize (1),
            }), ['onclick', 'rem', 'State', 'notify']), notify.message],
         ];
      });
   }

   // *** AUTH ***

   Views.auth = function (x) {
      var routes = [
         ['submit', 'auth', function (x) {
            var subview = B.get ('State', 'subview');
            var credentials = {
               username: c ('#auth-username').value,
               password: c ('#auth-password').value
            };
            if ((credentials.username || '').length < 3) return B.do (x, 'notify', 'red', 'Your username must be at least three characters.');
            if ((credentials.password || '').length < 6) return B.do (x, 'notify', 'red', 'Your password must be at least six characters.');
            if (subview === 'signup') {
               credentials.email = c ('#auth-email').value;
               if ((credentials.username || '').match (/@/)) return B.do (x, 'notify', 'red', 'Your username cannot contain the "@" sign.');
               if (c ('#auth-confirm').value !== credentials.password) return B.do (x, 'notify', 'red', 'Please confirm that your password is entered correctly.');
               if (State.token) credentials.token = decodeURIComponent (State.token);
               else {
                  if (confirm ('ac;pic is currently on alpha and is invitation only. Would you like to request an invitation?')) {
                     c.ajax ('post', 'requestInvite', {}, {email: credentials.email}, function (error) {
                        if (error) return alert ('Wow, we just experienced a connection error. Could you please try again?');
                        B.do (x, 'notify', 'green', 'We have successfully received your request! We\'ll get back to you ASAP.');
                     });
                  }
                  return;
               }
            }
            if (subview === 'login') credentials.tz = new Date ().getTimezoneOffset ();
            c.ajax ('post', 'auth/' + subview, {}, credentials, function (error, rs) {
               x = H.from (x, {ev: 'ajax', method: 'post', path: 'auth/' + subview});
               if (error) {
                  if (error.responseText === '{"error":"token"}') return B.do (x, 'notify', 'yellow', 'The email you provided does not match the invitation you received. Please enter the email where you received the invitation.');
                  if (error.responseText === '{"error":"verify"}') return B.do (x, 'notify', 'yellow', 'Please verify your email address before logging in.');
                  if (error.responseText === '{"error":"username"}') return B.do (x, 'notify', 'yellow', 'The username you provided is already in use. Please use another one.');
                  if (error.responseText === '{"error":"email"}') return B.do (x, 'notify', 'yellow', 'Seems there is already an account with that email. Should you try to login instead?');
                  return B.do (x, 'notify', 'red', 'There was an error ' + (subview === 'signup' ? 'signing up.' : 'logging in.'));
               }
               if (subview === 'signup') {
                  delete State.token;
                  c ('#auth-username').value = '';
                  c ('#auth-password').value = '';
               }

               if (c.cookie () [COOKIENAME]) {
                  B.do (x, 'notify', 'green', 'Welcome!');
                  B.do (x, 'set', ['State', 'view'], 'main');
               }
               else {
                  B.do (x, 'notify', 'green', 'You have successfully created your account! Please check your inbox.');
                  return B.do (x, 'set', ['State', 'subview'], 'login');
               }
            });
         }],
         ['submit', 'recover', function (x) {
            var credentials = {
               username: c ('#auth-username').value,
            };
            if ((credentials.username || '').length < 3) return B.do (x, 'notify', 'red', 'Your username must be at least three characters.');
            c.ajax ('post', 'auth/recover', {}, credentials, function (error, rs) {
               x = H.from (x, {ev: 'ajax', method: 'post', path: 'auth/recover'});
               if (error && error.status === 500) return B.do (x, 'notify', 'red', 'There was an unexpected error. Please contact us through email.');
               c ('#auth-username').value = '';
               B.do (x, 'set', ['State', 'subview'], 'login'),
               B.do (x, 'notify', 'green', 'You should receive an email with instructions for resetting your password.');
            });
         }],
         ['submit', 'reset', function (x) {
            var credentials = {
               password: c ('#auth-password').value,
            };
            if ((credentials.password || '').length < 6) return B.do (x, 'notify', 'red', 'Your new password must be at least three characters.');
            if (State.token)    credentials.token    = decodeURIComponent (State.token);
            if (State.username) credentials.username = decodeURIComponent (State.username);

            if (c ('#auth-confirm').value !== credentials.password) return B.do (x, 'notify', 'red', 'Please confirm that your password is entered correctly.');

            c.ajax ('post', 'auth/reset', {}, credentials, function (error, rs) {
               x = H.from (x, {ev: 'ajax', method: 'post', path: 'auth/reset'});
               if (error) {
                  if (error.status === 500) return B.do (x, 'notify', 'red', 'There was an unexpected error. Please contact us through email.');
                  return B.do (x, 'notify', 'red', 'Invalid reset password link.');
               }
               delete State.token;
               delete State.username;
               c ('#auth-password').value = '';
               B.do (x, 'set', ['State', 'subview'], 'login'),
               B.do (x, 'notify', 'green', 'Your password was changed successfully! Please login.');
            });
         }],
      ];

      return B.view (x, ['State', 'subview'], {listen: routes, ondraw: function (x) {
         if (['login', 'signup', 'recover', 'reset'].indexOf (B.get ('State', 'subview')) === -1) B.do (x, 'set', ['State', 'subview'], 'login');
         dale.do (c ('input'), function (input) {input.value = ''});
      }}, function (x, subview) {

         var fields = {
            signup:  ['Username', 'Email', 'Password', 'Confirm'],
            login:   ['Username', 'Password'],
            recover: ['Username'],
            reset:   ['Password', 'Confirm'],
         } [subview];

         return [
            ['form', H.style ({onsubmit: 'event.preventDefault ()'}, {
               width:         H.spaceh (20),
               'margin-left': H.spaceh (5),
            }), [
               ['fieldset', H.style ({width: H.spaceh (16)}), [
                  ['legend', H.style ({class: 'bold'}, {'font-size': H.fontsize (1.3)}), {login: 'Login', signup: 'Sign in', recover: 'Recover password', reset: 'Reset password'} [subview]],
                  ['br'],
                  dale.do (fields, function (V) {
                     var v = V.toLowerCase ();
                     return ['div', [
                        ['label', H.style ({class: 'bold', for: 'auth-' + v}, {
                           display: 'inline-block',
                           width:   H.spaceh (3),
                        }), V],
                        ['input', H.style ({
                           id: 'auth-' + v,
                           type: (v === 'password' || v === 'confirm') ? 'password' : 'text',
                           placeholder: v
                        }, {
                           height: 41,
                           'border-radius': 20,
                           border: 0,
                           'background-color': H.css.gray5,
                           'padding-left': 16,
                           'line-height': 0.7,
                           'font-family': H.css.font,
                           'font-size': H.fontsize (-1),
                        })],
                        ['br'], ['br'],
                     ]];
                  }),
                  ['div', [
                     ['button', B.ev (H.style ({
                        'background-color': H.css.highlight,
                        cursor: 'pointer',
                        color: 'white',
                        border: 'none',
                        'font-weight': 'bold',
                        'border-radius':  25,
                        'padding-top':    8,
                        'padding-bottom': 9,
                        'padding-left':   12,
                        'padding-right':  13
                     }), ['onclick', 'submit', (subview === 'login' || subview === 'signup') ? 'auth' : subview || 'auth']), 'Submit'],
                     ['br'], ['br'],
                     subview === 'login' ? [
                        ['a', {class: 'bold', href: '#/auth/signup'}, 'Don\'t have an account yet? Create one.'],
                        ['br'], ['br'],
                        ['a', {class: 'bold', href: '#/auth/recover'}, 'Forgot your password?'],
                     ] : ['a', {class: 'bold', href: '#/auth/login'},  'Already have an account? Log in.'],
                  ]]
               ]]
            ]]
         ]
      });
   }

   // *** MAIN VIEW ***

   Views.main = function (x) {
      var routes = [
         ['change', ['State', 'upload', 'queue'], function (x) {
            var queue = B.get ('State', 'upload', 'queue');
            var MAXSIMULT = 2, uploading = 0;
            dale.do (queue, function (file) {
               if (uploading === MAXSIMULT) return;
               if (file.uploading) return uploading++;
               file.uploading = true;
               uploading++;

               var f = new FormData ();
               f.append ('lastModified', (file.lastModified || new Date ().getTime ()) - new Date ().getTimezoneOffset () * 60 * 1000);
               f.append ('pic', file);
               if (B.get ('State', 'upload', 'tags')) f.append ('tags', teishi.s ([B.get ('State', 'upload', 'tags')]));
               H.authajax (x, 'post', 'pic', {}, f, function (error, rs) {
                  dale.do (B.get ('State', 'upload', 'queue'), function (v, i) {
                     if (v === file) B.do (x, 'rem', ['State', 'upload', 'queue'], i);
                  });
                  if (error && error.status === 409 && error.responseText.match ('repeated')) return B.do (x, 'set', ['State', 'upload', 'repeated'], (B.get ('State', 'upload', 'repeated') || 0) + 1);
                  if (error && error.status === 409 && error.responseText.match ('capacity')) {
                     B.do (x, 'set', ['State', 'upload', 'queue'], []);
                     return B.do (x, 'notify', 'yellow', 'You\'ve exceeded the maximum capacity of your plan so you cannot upload any more pictures.');
                  }
                  if (error) return B.do (x, 'add', ['State', 'upload', 'error'], [error, file]);
                  B.do (x, 'set', ['State', 'upload', 'done'], (B.get ('State', 'upload', 'done') || 0) + 1);
               });
            });
         }],
         ['retrieve', 'account', function (x) {
            H.authajax (x, 'get', 'account', {}, '', function (error, rs) {
               if (error) return B.do (x, 'notify', 'red', 'There was an error retrieving account information.');
               B.do (x, 'set', ['Data', 'account'], rs.body);
            });
         }],
      ];

      return B.view (x, ['State', 'subview'], {listen: routes, ondraw: function (x) {
         if (['browse', 'upload', 'tags', 'account'].indexOf (B.get ('State', 'subview')) === -1) B.do (x, 'set', ['State', 'subview'], 'browse');
         if (! B.get ('Data', 'account')) B.do (x, 'retrieve', 'account');
      }}, function (x, subview) {
         if (window.innerWidth < 1024 && window.innerWidth < window.innerHeight) return ['div', H.style ({
            'width, height': 1,
            'background-color': 'white',
            padding: 20,
            filter: 'invert(100%)',
         }), [
            ['h3', {class: 'logo'}, [
               ['span', H.style ({color: H.css.highlight}),                                  'ac;'],
               ['span', H.style ({color: H.css ['tagc' + Math.floor (Math.random () * 8)]}), 'pic'],
            ]],
            ['p', 'Please turn your device sideways :)'],
         ]];
         return [
            Views.topbar (x),
            Views.canvas (x),
            Views [subview] ? Views [subview] (x) : [],
         ];
      });
   }

   // *** TOP BAR ***

   Views.topbar = function (x) {
      var mobile = window.innerWidth < 1024;
      return [
         ['div', H.style ({
            width: 1,
            height: 50,
            'padding-left': H.spaceh (1),
            'padding-top':  H.spacev (0.5),
            position: 'fixed',
            'z-index': '2',
            'background-color': 'white',
         }), [
            ['div', H.style ({class: 'float'}, {width: H.spaceh (mobile ? 15 : 9)}), [
               ['h3', H.style ({margin: 0}), [
                  ['span', H.style ({color: H.css.highlight}),                                  'ac;'],
                  ['span', H.style ({color: H.css ['tagc' + Math.floor (Math.random () * 8)]}), 'pic'],
               ]],
            ]],
            ['div', H.style ({class: 'float'}, {width: H.spaceh (mobile ? 13 : 24)}), [
               ['style', ['div.nav span', {
                  cursor: 'pointer',
                  'margin-right': H.spaceh (0.5),
                  'font-size': H.fontsize (-1),
               }]],
               ['span', B.ev (H.if (B.get ('State', 'subview') === 'browse', H.style ({color: H.css.highlight}), {}), ['onclick', 'set', ['State', 'subview'], 'browse']), 'Pictures'],
               ['span', B.ev (H.if (B.get ('State', 'subview') === 'tags',   H.style ({color: H.css.highlight}), {}), ['onclick', 'set', ['State', 'subview'], 'tags']), 'Tags'],
            ]],
            ['div', H.style ({class: 'float'}, {width: H.spaceh (mobile ? 11 : 6)}), [
               ['div', {class: 'account float'}, [
                  ['style', ['div.account i', {
                     display: 'inline-block',
                     'margin-top, margin-right': 10,
                  }]],
                  ['span', H.style ({class: 'bold'}, {'margin-left': 8, 'font-size': H.fontsize (-0.8)}), [
                     ['i', B.ev ({title: 'Log Out', class: 'pointer ion-log-out'}, ['onclick', 'logout', []])],
                     ['i', {onclick: 'alert ("Coming soon!")', title: 'Account', class: 'pointer ion-android-person'}],
                  ]],
               ]],
               ['div', B.ev ({class: 'upload float pointer'}, ['onclick', 'set', ['State', 'subview'], 'upload']), [
                  ['i', {class: 'ion-ios-plus-outline'}],
                  ['span', 'Upload'],
               ]],
            ]],
         ]],
         ['style', [
            ['div.upload', {
               height: 32,
               'line-height': 32,
               'background-color': H.css.highlight,
               color: 'white',
               border: 'none',
               'font-weight': 'bold',
               'border-radius': 25,
               'display': 'flex',
               'align-items': 'center',
               'justify-content': 'center',
               'font-size': H.fontsize (-1.5),
               width: 91,
               padding: 3,
               display: 'inline-flex',
               'align-items': 'flex-end',
            }, [
               ['i', {
                  margin: 0,
                  'margin-right': 5,
                  color: 'white',
                  'font-weight': 'bold',
                  'font-size': H.fontsize (1),
                  'vertical-align': 'baseline',
               }],
            ]],
         ]],
      ];
   }

   // *** BROWSE VIEW ***

   Views.browse = function (x) {
      var mobile = window.innerWidth < 1024;
      return [
         ['style', [
            ['div.left', {
               'margin-top': 50,
               position: 'fixed',
               'margin-left': H.spaceh (1),
               width:         H.spaceh (mobile ? 14 : 8),
               height: 1,
               'border-top': 'solid 1px ' + H.css.gray5,
            }],
            ['div.center', {
               'margin-top': 50,
               'margin-left': H.spaceh (mobile ? 15 : 9),
               width: H.spaceh (mobile ? 22 : 28),
               padding: H.spaceh (1),
               'border-top, border-left': 'solid 1px ' + H.css.gray5,
            }],
            ['div.loading', {
               position: 'fixed',
               bottom: 25,
               width: 120,
               left: Math.round (window.innerWidth * 24 / 40 - 140),
               'background-color': H.css.gray1,
               'border-radius': 25,
               padding: 10,
               color: 'white',
               'z-index': '1',
               'text-align': 'center',
            }],
            ['div.centertop', {
               'min-height, height': 130,
            }],
            ['ul.tags', {
               'list-style-type': 'none',
               padding: 0,
               margin: 0,
            }, [
               ['li', {
                  cursor: 'pointer',
                  'font-size': H.fontsize (-1),
                  'font-weight': 'bold',
                  //color: H.css.gray2,
                  position: 'relative',
                  width: 0.8,
                  'padding-left, padding-right': 24,
               }],
               ['li.selected', {
                  color: H.css.gray1,
               }],
               ['i.cancel', {
                  position: 'absolute',
                  right: 5,
                  top: 0,
               }],
            ]],
            ['span.tag', {
               position: 'absolute',
               'left, top': 0,
               'width, height': 16,
            }],
            ['div.input-search', {
               position: 'relative',
               width: H.spaceh (6.5),
            }, [
               ['input', {width: 1}],
               ['i', {
                  position: 'absolute',
                  left: H.spaceh (6),
                  'font-size': H.fontsize (1.5),
                  top: 10,
               }],
            ]],
         ]],
         B.view (x, ['State', 'loading'], function (x, loading) {
            if (loading) return ['div', {class: 'loading'}, 'loading...'];
         }),
         ['div', {class: 'left'}, [
            Views.query  (x),
            Views.manage (x),
         ]],
         ['div', {class: 'center float'}, [
            ['div', {class: 'centertop'}, [
               B.view (x, ['State', 'selected'], function (x, selected) {
                  return B.view (x, ['State', 'query', 'tags'], function (x, qtags) {
                     return B.view (x, ['Data', 'tags'], function (x, tags) {
                        return B.view (x, ['Data', 'total'], function (x, total) {
                           total = total || 0;
                           var style = H.style ({class: 'gray2'}, {'margin-top': '0.5rem', 'margin-bottom': '1.5rem'});
                           if (! qtags || qtags.length === 0)        return ['h1', style, 'All Pictures (' + total  + ')'];
                           else if (teishi.eq (['untagged'], qtags)) return ['h1', style, 'Untagged (' + total + ')'];
                           else if (qtags.length === 1)              return ['h1', style, qtags [0] + ' (' + total + ')'];
                           else                                      return ['h1', style, 'Multiple tags (' + total + ')'];
                        });
                     });
                  });
               }),
               B.view (x, ['State', 'query', 'tags'], {attrs: {class: 'float', style: 'width: ' + H.spaceh (14)}}, function (x, qtags) {
                  return B.view (x, ['Data', 'tags'], function (x, tags) {
                     return B.view (x, ['Data', 'total'], function (x, total) {
                        if (! qtags || qtags.length === 0) return ['p', {class: 'float bold gray2'}];
                        else if (teishi.eq (['untagged'], qtags)) return ['p', {class: 'float bold gray2'}];
                        else return dale.do (teishi.c (qtags).sort (H.tagsort), function (tag) {
                           return [
                              ['p', {class: 'float bold gray2'}, [
                                 ['span', {style: 'position: static; float: left;', class: 'opaque tag ' + murmur.v3 (tag)}],
                                 ['span', {style: 'margin-left: 0px; margin-right: 15px;', class: 'float'}, tag],
                              ]],
                           ];
                        });
                     });
                  });
               }),
               B.view (x, ['State', 'query', 'sort'], function (x, sort) {
                  return ['div', {class: 'floatr', style: 'height: 80px; width: ' + H.spaceh (11)}, [
                     ['style', [
                        ['p.select', {
                           'margin-right': 20,
                        }],
                     ]],
                     ['select', B.ev ({class: 'floatr', style: 'padding: 5px'}, ['onchange', 'set', ['State', 'query', 'sort']]), [
                        ['option', {selected: sort === 'newest', value: 'newest'}, 'Newest'],
                        ['option', {selected: sort === 'oldest', value: 'oldest'}, 'Oldest'],
                        ['option', {selected: sort === 'upload', value: 'upload'}, 'Upload'],
                     ]],
                     ['p', B.ev ({class: 'select bold pointer floatr gray2'}, ['onclick', 'selectall', []]), ' Select all'],
                  ]];
               }),
               ['br'], ['br'],
               ['hr'],
            ]],
            Views.pics (x, ['Data', 'pics'], 29 / 40 * window.innerWidth)
         ]],
         /*
         ['div', {class: 'right'}, [
         ]],
         */
      ];
   }

   // *** QUERY VIEW ***

   Views.query = function (x) {
      var mobile = window.innerWidth < 1024;
      var routes = [
         ['change', ['State', 'query'], function (x) {
            var untaggedIndex = (B.get ('State', 'query', 'tags') || []).indexOf ('untagged');
            if (untaggedIndex > -1 && B.get ('State', 'query', 'tags').length > 1) return B.do (x, 'rem', ['State', 'query', 'tags'], untaggedIndex);
            B.do (x, 'retrieve', 'pics');
         }],
         // We update the tag svgs whenever a change fires on the page. We use priority -1000 so that we run this after the views are updated.
         ['change', '*', {priority: -1000}, function () {
            dale.do (c ('span.tag'), function (el) {
               var i = parseInt (el.getAttribute ('class').replace ('opaque tag ', '').slice (-2));
               var color = H.css ['tagc' + Math.floor (i / (100 / 7))];
               el.innerHTML = H.icons.tag (color);
            });
         }],
      ];
      return B.view (x, ['State', 'query'], {listen: routes, ondraw: function (x) {
         if (! B.get ('State', 'query')) B.do (x, 'set', ['State', 'query'], {tags: [], sort: 'newest'});
         if (! B.get ('State', 'refreshQuery')) {
            B.do (x, 'set', ['State', 'refreshQuery'], setInterval (function () {
               var queue = B.get ('State', 'upload', 'queue');
               if (queue && queue.length > 0) B.do (H.from (x, {from: {ev: 'refreshQuery'}}), 'retrieve', 'pics');
            }, 1000));
         }
      }}, function (x, query) {
         if (! query) return;
         return B.view (x, ['Data', 'pics'], function (x, pics) {
            return B.view (x, ['State', 'selected'], function (x, selected) {
               var selected = dale.keys (selected).length;
               return [
                  ['h4', {class: 'gray2', style: 'font-weight: normal; margin-top: ' + H.spacev (0.5)}, 'Pictures'],
                  B.view (x, ['State', 'slider'], function (x, slider) {
                     var color = H.if (selected, H.if (slider, H.css.bad, H.css.good), H.if (slider, 'rgba(255,162,0,0.2)', 'rgba(60,172,255,0.2)'));
                     var hide = mobile ? 'hidden' : ''
                     return [
                        ['style', [
                           ['div.slider', {
                              height: 44,
                              'border-radius': 22,
                              width: 0.9,
                              cursor: 'pointer',
                           }],
                           ['div.slider div', {
                              float: 'left',
                              'border-radius': 18,
                              height: 36,
                              'margin-top': 4,
                              display: 'flex',
                              'align-items': 'center',
                              'padding-left, padding-right': 10,
                              'margin-left, margin-right': 8,
                              color: H.css.gray2,
                           }],
                           ['div.selected', {
                              'background-color': 'white',
                              color: 'black',
                           }],
                           ['div.hidden', {
                              display: 'none',
                           }],
                           ['div.slider p', {
                              'font-size': H.fontsize (-1.7),
                              'margin-left': 5,
                           }],
                        ]],
                        ['div', B.ev ({class: 'slider', style: 'background-color: ' + color}, ['onclick', 'set', ['State', 'slider'], ! slider]), [
                           H.if (selected, [
                              ['div', {style: 'margin-left: 5px', class: H.if (slider, 'selected', hide)}, [
                                 ['i', {class: 'float ion-android-add'}],
                                 ['p', 'Add tags']
                              ]],
                              ['div', {style: 'float: right', class: H.if (slider, hide, 'selected')}, [
                                 ['i', {class: 'float ion-scissors'}],
                                 ['p', 'Remove tags']
                              ]],
                           ], [
                              ['div', {style: 'margin-left: 5px',  class: H.if (slider, hide, 'selected')}, [
                                 ['i', {class: 'float ion-ios-pricetags-outline'}],
                                 ['p', 'All tags']
                              ]],
                              ['div', {style: 'float: right', class: H.if (slider, 'selected', hide)}, [
                                 ['i', {class: 'float ion-eye'}],
                                 ['p', 'Selected tags']
                              ]],
                           ]),
                        ]],
                     ];
                  }),
                  ['br'],
                  ['style', ['div.tags', {
                     'padding-left, padding-right': H.spaceh (0.25),
                  }]],
                  B.view (x, ['Data', 'tags'], {attrs: {class: 'tags'}}, function (x, tags) {
                     if (! tags) return;

                     var tagmaker = function (tag, k, active) {

                        var tagn = ['', tag, tags [tag] ? [' (', tags [tag], ')'] : ''];

                        if (active) return [['li', B.ev (['onclick', 'rem', ['State', 'query', 'tags'], k]), [
                           ['span', {class: 'opaque tag ' + murmur.v3 (tag)}],
                           tagn,
                           ['i', {class: 'cancel icon ion-close'}],
                        ]], ['br']];

                        return [['li', B.ev ([
                           ['onclick', 'add', ['State', 'query', 'tags'], tag],
                           ['onclick', 'rem', 'State', 'autoquery'],
                        ]), [
                           ['span', {class: 'opaque tag ' + murmur.v3 (tag)}],
                           tagn,
                        ]], ['br']];
                     }

                     return [
                        ['style', ['i.inline', {'margin-right': 10}]],
                        ['p', B.ev ({class: 'pointer ' + H.if (query.tags.length === 0, 'bold')}, ['onclick', 'set', ['State', 'query', 'tags'], []]), [
                           H.if (query.tags.length === 0, ['div']),
                           ['i', {class: 'float inline icon ion-camera'}],
                           ['All pictures (', tags.all + ')']
                        ]],
                        ['p', B.ev ({class: 'pointer ' + H.if (query.tags.indexOf ('untagged') === 0, 'bold')}, ['onclick', 'set', ['State', 'query', 'tags'], ['untagged']]), [
                           H.if (query.tags.indexOf ('untagged') === 0, ['div']),
                           ['i', {class: 'float inline icon ion-ios-pricetag-outline'}],
                           ['Untagged (' + tags.untagged + ')'],
                        ]],
                        ['div', {style: 'height: 2px'}],
                        H.if (query.tags.length > 0 && query.tags [0] !== 'untagged', ['ul', {class: 'tags gray2'}, dale.do (query.tags, function (tag, k) {
                           return tagmaker (tag, k, true);
                        })]),
                        H.if (tags.length === 0, ['p', 'No tags yet! Click the upload button to add pictures and tags.']),
                        B.view (x, ['State', 'autoquery'], function (x, autoquery) {
                           return B.view (x, ['State', 'slider'], function (x, slider) {
                              var matches = dale.fil (dale.keys (tags), undefined, function (tag) {
                                 if (tag === 'all' || tag === 'untagged') return;
                                 if (tag.match (new RegExp (autoquery || '', 'i')) && query.tags.indexOf (tag) === -1) return tag;
                              }).sort (H.tagsort);

                              if (matches.length > 0) return ['ul', {class: 'tags gray2'}, dale.do (matches, function (tag) {
                                 return tagmaker (tag);
                              })];
                           });
                        }),
                        query.tags.length > 0 && query.tags [0] !== 'untagged' ?
                           ['h5', {class: 'gray2'}, [['div'], 'FILTER']] :
                           ['h5', {class: 'gray2'}, 'FILTER'],
                        B.view (x, ['State', 'autoquery'], {attrs: {class: 'input-search'}}, function (x, autoquery) {
                           return [
                              ['input', B.ev ({placeholder: 'Filter by tag', value: autoquery}, ['oninput', 'set', ['State', 'autoquery']])],
                              ['i', {class: 'icon ion-ios-search'}],
                           ];
                        }),
                     ];
                  }),
               ];
            });
         });
      });
   }

   // *** MANAGE VIEW ***

   Views.manage = function (x) {
      var routes = [
         ['retrieve', 'pics', function (x) {
            var q = B.get ('State', 'query');
            if (! q) return;
            var num = (B.get ('Data', 'pics') || []).length;

            B.do (x, 'set', ['State', 'loading'], true);
            H.authajax (x, 'post', 'query', {}, {tags: q.tags, sort: q.sort, from: 1, to: num + 30}, function (error, rs) {
               if (error) return B.do (x, 'notify', 'red', 'There was an error querying the picture(s).');
               var selected = {};
               dale.do (rs.body.pics, function (newpic) {
                  if (B.get ('State', 'selected', newpic.id)) selected [newpic.id] = true;
               });
               B.do (x, 'set', ['State', 'selected'], selected);
               B.do (x, 'set', ['Data', 'pics'], rs.body.pics);
               B.do (x, 'set', ['Data', 'total'], rs.body.total);
               B.do (x, 'rem', 'State', 'loading');
            });
         }],
         ['retrieve', 'tags', function (x) {
            H.authajax (x, 'get', 'tags', {}, '', function (error, rs) {
               if (error) return B.do (x, 'notify', 'red', 'There was an error querying the tags.');
               B.do (x, 'set', ['Data', 'tags'], rs.body);
               var tags = dale.keys (rs.body);
               dale.do (B.get ('State', 'query', 'tags') || [], function (tag, k) {
                  if (tags.indexOf (tag) === -1) B.do (x, 'rem', ['State', 'query', 'tags'], k);
               });
            });
         }],
         ['delete', 'pics', function (x) {
            var pics = dale.keys (B.get ('State', 'selected'));
            if (pics.length === 0) return;
            if (! confirm ('Are you sure you want to delete the selected pictures?')) return;
            B.do (x, 'notify', 'yellow', 'Deleting, please wait...');
            var deleteOne = function () {
               H.authajax (x, 'delete', 'pic/' + pics.shift (), {}, '', function (error, rs) {
                  if (error) return B.do (x, 'notify', 'red', 'There was an error deleting the picture(s).');
                  if (pics.length > 0) deleteOne ();
                  else {
                     B.do (x, 'retrieve', 'tags');
                     B.do (x, 'retrieve', 'pics');
                     B.do (x, 'notify', 'green', 'The pictures were successfully deleted.');
                  }
               });
            }
            deleteOne ();
         }],
         ['tag', 'pics', function (x, tag, del) {
            if (tag === true) tag = B.get ('State', 'autotag');
            if (! tag) return;
            if (del && ! confirm ('Are you sure you want to remove the tag ' + tag + ' from all selected pictures?')) return;
            if (BASETAGS.indexOf (tag) > -1) return B.do (x, 'notify', 'yellow', 'Sorry, you can not use that tag.');
            if (H.isyear (tag)) return B.do (x, 'notify', 'yellow', 'Sorry, you can not use that tag.');
            var ids = dale.keys (B.get ('State', 'selected'));
            if (ids.length === 0) return;
            var payload = {
               tag: tag,
               ids: ids,
               del: del
            }
            H.authajax (x, 'post', 'tag', {}, payload, function (error, rs) {
               if (error) return B.do (x, 'notify', 'red', 'There was an error tagging the picture(s).');
               B.do (x, 'notify', 'green', (del ? 'Untag' : 'Tag') + ' successful!');
               B.do (x, 'retrieve', 'tags');
               B.do (x, 'change', ['State', 'query', 'tags']);
               B.do (x, 'rem', 'State', 'autotag');
               B.do (x, 'rem', 'State', 'action');
            });
         }],
         ['rotate', 'pics', function (x, deg) {
            var pics = dale.keys (B.get ('State', 'selected'));
            if (pics.length === 0) return;
            H.authajax (x, 'post', 'rotate', {}, {deg: deg, ids: pics}, function (error, data) {
               if (error) return B.do (x, 'notify', 'red', 'There was an error rotating the picture(s).');
               B.do (x, 'retrieve', 'pics');
            });
         }],
         ['selectall', [], function (x) {
            H.authajax (x, 'post', 'query', {}, {tags: B.get ('State', 'query', 'tags'), from: 1, to: 1024 * 1024 * 1024, sort: 'newest'}, function (error, rs) {
               if (error) return B.do (x, 'notify', 'red', 'There was an error selecting all pictures.');
               B.do (x, 'set', ['State', 'selected'], dale.obj (rs.body.pics, function (pic) {
                  return [pic.id, true];
               }));
            });
         }],
      ];

      return B.view (x, ['Data', 'tags'], {listen: routes, ondraw: function (x) {
         if (! B.get ('Data', 'tags')) B.do (x, 'retrieve', 'tags');
      }}, function (x, tags) {
         return B.view (x, ['Data', 'pics'], function (x, pics) {
            return B.view (x, ['State', 'selected'], function (x, selected) {
               selected = dale.keys (selected).length;
               if (selected === 0) return;
               var picn = selected === 1 ? 'picture' : 'pictures';
               return [
                  ['h4', {class: 'gray4'}, [
                     ['Edit ', picn, ' (' + selected + ')'],
                     ['i', B.ev ({style: 'color: white', class: 'floatr icon ion-close'}, ['onclick', 'set', ['State', 'selected'], {}])],
                  ]],
                  ['hr'],
                  ['style', [
                     ['div.rotate', {
                        width: H.spaceh (5),
                        'border-radius': 20,
                        height: 45,
                        'background-color': H.css.gray1,
                        position: 'relative',
                     }],
                     ['i.edit', {
                        width: 0.27,
                        padding: 0.03,
                        display: 'block',
                        float: 'left',
                        'font-size': H.fontsize (1),
                        'text-align': 'center',
                        'line-height': 35,
                        color: H.css.gray5,
                     }],
                     ['i#delete', {
                        right: '-' + H.spaceh (2),
                        top: 0,
                        position: 'absolute',
                        'font-size': H.fontsize (2),
                        color: '#ff0033',
                     }],
                  ]],
                  ['h6', {class: 'gray4', style: 'margin-bottom: 15px'}, 'ROTATE'],
                  ['div', {class: 'rotate'}, [
                     ['i', B.ev ({text: 'Rotate left', class: 'edit pointer ion-arrow-left-a'},  ['onclick', 'rotate', 'pics', -90])],
                     ['i', B.ev ({text: 'Rotate right', class: 'edit pointer ion-arrow-right-a'}, ['onclick', 'rotate', 'pics', 90])],
                     ['i', B.ev ({text: 'Invert', class: 'edit pointer ion-arrow-down-a'},  ['onclick', 'rotate', 'pics', 180])],
                     ['i', B.ev ({text: 'Delete', id: 'delete', class: 'edit pointer ion-android-delete'}, ['onclick', 'delete', 'pics'])],
                  ]],
                  ['h6', {class: 'gray4'}, 'REMOVE TAGS'],
                  (function () {
                     var tags = {};
                     dale.do (B.get ('Data', 'pics'), function (pic) {
                        if (! B.get ('State', 'selected', pic.id)) return;
                        dale.do (pic.tags, function (tag) {
                           if (H.isyear (tag)) return;
                           tags [tag] = tags [tag] ? tags [tag] + 1 : 1;
                        });
                     });
                     return ['ul', {class: 'tags gray4'}, dale.do (tags, function (k, tag) {
                        var tagn = ['', tag, k ? [' (', k, ')'] : ''];
                        return [['li', B.ev (['onclick', 'tag', 'pics', tag, true]), [
                           ['span', {class: 'opaque tag ' + murmur.v3 (tag)}],
                           tagn,
                           ['i', {class: 'cancel icon ion-close'}],
                        ]], ['br']];
                     })];
                  }) (),
                  ['h6', {class: 'gray4'}, 'ADD TAGS'],
                  B.view (x, ['State', 'autotag'], {attrs: {class: 'input-search'}, listen: [
                  ]}, function (x, autotag) {
                     var matches = dale.obj (B.get ('Data', 'tags'), function (card, tag) {
                        if (H.isyear (tag) || BASETAGS.indexOf (tag) > -1) return;
                        if (tag.match (new RegExp (autotag || '', 'i'))) return [tag, card];
                     });
                     return [
                        ['input', B.ev ({placeholder: 'Enter tag', value: autotag},
                           ['oninput', 'set', ['State', 'autotag']],
                        ), ['i', {class: 'icon ion-ios-search'}]],
                        ['ul', {class: 'tags gray4'}, [
                           matches [autotag] || autotag === undefined || autotag === '' ? [] : [['li', B.ev (['onclick', 'tag', 'pics', autotag]), [
                              ['span', {class: 'opaque tag ' + murmur.v3 ('uom')}],
                              autotag + ' (new tag)',
                           ]], ['br']],,
                           dale.do (dale.keys (matches).sort (H.tagsort), function (tag) {
                              var k = matches [tag];
                              var tagn = ['', tag, k ? [' (', k, ')'] : ''];
                              return [['li', B.ev (['onclick', 'tag', 'pics', tag]), [
                                 ['span', {class: 'opaque tag ' + murmur.v3 (tag)}],
                                 tagn,
                              ]], ['br']];
                           }),
                        ]],
                     ];
                  }),
               ];
            });
         });
      });
   }

   // *** UPLOAD VIEW ***

   Views.upload = function (x) {
      var routes = [
         ['upload', 'pics', function (x) {

            var pics = c ('form input') [0]

            if (pics.files.length === 0) return B.do (x, 'notify', 'yellow', 'Please select one or more pics.');

            dale.do (pics.files, function (file, k) {
               if (ALLOWEDMIME.indexOf (file.type) > -1) {
                  B.do (x, 'add', ['State', 'upload', 'queue'], file);
               }
               else B.do (x, 'add', ['State', 'upload', 'invalid'], file.name);
            });
            c ('#upload').value = '';
         }],
         ['retry', 'upload', function (x) {
            var files = B.get ('State', 'upload', 'error');
            B.do (x, 'set', ['State', 'upload', 'error'], []);
            dale.do (files, function (file) {
               file = file [1];
               file.uploading = false;
               B.do (x, 'add', ['State', 'upload', 'queue'], file);
            });
         }],
         ['cancel', 'upload', function (x) {
            if (! confirm ('Are you sure you want to cancel the upload?')) return;
            B.do (x, 'set', ['State', 'upload', 'queue'], []);
         }],
      ];

      return B.view (['State', 'uploadModal'], function (x, modal) {
         if (! modal) return;
         return [
            ['style', [
               ['div.uploadLeft', {
                  'padding-left': H.spaceh (1),
                  width: H.spaceh (11),
                  'background-color': 'white',
                  'border-top-left-radius, border-bottom-left-radius': 21,
               }],
               ['div.uploadRight', {
                  'padding-left, padding-right': H.spaceh (0.5),
                  width: H.spaceh (7),
                  'background-color': H.css.gray2,
                  'border-top-right-radius, border-bottom-right-radius': 21,
               }],
            ]],
            ['div', {class: 'uploadModal'}, ['div', {class: 'inner'}, [
               ['i', B.ev ({class: 'icon ion-close pointer'}, ['onclick', 'rem', 'State', 'uploadModal'])],
               B.view (x, ['State', 'upload'], {listen: routes}, function (x, upload) {return [
                  ['div', {class: 'uploadLeft float'}, [
                     ['h3', {style: 'color: ' + H.css.highlight}, [
                        ['img', {src: 'lib/icons/icon-camera.svg'}],
                        'Upload pictures',
                     ]],
                     ['form', {onsubmit: 'event.preventDefault ()'}, [
                        ['br'], ['br'],
                        B.view (x, ['State', 'uploadFolder'], function (x, uploadFolder) {
                           if (uploadFolder) return [
                              ['h3', ['Upload a folder (or ', ['span', B.ev ({class: 'action'}, ['onclick', 'set', ['State', 'uploadFolder'], false]), 'individual pictures'], ')']],
                              ['input', {id: 'upload', type: 'file', name: 'pics', directory: true, webkitdirectory: true, mozdirectory: true}]
                           ];
                           else return [
                              ['h3', ['Upload one or more pictures (or ', ['span', B.ev ({class: 'action'}, ['onclick', 'set', ['State', 'uploadFolder'], true]), ' an entire folder'], ')']],
                              ['input', {id: 'upload', type: 'file', name: 'pics', multiple: true}],
                           ];
                        }),
                        ['button', B.ev ({type: 'submit', class: 'pure-button pure-button-primary'}, ['onclick', 'upload', 'pics']), 'Upload'],
                     ]],
                  ]],
                  ['div', {class: 'uploadRight float'}, [
                     ['br'], ['br'],
                     ['h3', 'Add a tag to the uploaded pictures'],
                     ['input', B.ev ({placeholder: 'tags'}, ['onchange', 'set', ['State', 'upload', 'tags']])],
                     ['br'], ['br'],
                     ['button', B.ev ({type: 'submit', class: 'pure-button'}, ['onclick', 'cancel', 'upload']), 'Cancel upload'],
                  ]],
                  ! upload ? [] : (function () {
                     upload.queue = upload.queue || [];
                     upload.done  = upload.done  || 0;
                     upload.error = upload.error || [];
                     upload.invalid = upload.invalid || [];
                     var perc = Math.round (upload.done / (upload.queue.length + upload.done) * 100);
                     if (perc === 0) perc = 2;
                     perc += '%';
                     return ['div', {class: 'pure-g'}, [
                        ['div', {class: 'pure-u-5-5'}, [
                           ['br'], ['br'],
                           H.if (upload.queue.length === 0 && upload.done > 0, ['h4', ['Uploaded ', upload.done, ' pictures']]),
                           H.if (upload.queue.length > 0, ['h4', ['Uploading ', upload.queue.length, ' pictures']]),
                           H.if (upload.queue.length > 0 || upload.done > 0, ['div', {class: 'progress-out'}, ['div', {class: 'progress-in', style: 'width: ' + perc}, ['p', perc]]]),
                           H.if (upload.queue.length > 0, ['h4', ['While you wait, you can', ['span', B.ev ({class: 'action'}, ['onclick', 'set', ['State', 'subview'], 'browse']), ' start tagging your pictures!']]]),
                           H.if (upload.error.length > 0, ['div', {class: 'pure-u-5-5'}, [
                              ['p', ['There was an error uploading ' + upload.error.length + ' pictures. ', ['span', B.ev ({class: 'action'}, ['onclick', 'retry', 'upload']), 'Retry']]],
                           ]]),
                           H.if (upload.done > 0, ['p', ['Uploaded ' + upload.done + ' pictures successfully.']]),
                           H.if (upload.repeated > 0, ['p', [upload.repeated + ' pictures were already uploaded before.']]),
                           H.if (upload.invalid && upload.invalid.length > 0, ['p', [upload.invalid.length + ' pictures were of an invalid format.']]),
                        ]],
                     ]];
                  }) (),
               ]}),
            ]]],
         ];
      })
   }

   // *** PICS VIEW ***

   Views.pics = function (x, path, width) {
      var mobile = window.innerWidth < 1024;
      var routes = [
         ['click', 'pic', function (x, id, k) {
            var last = B.get ('State', 'lastclick') || {time: 0};
            if (last.id === id && Date.now () - B.get ('State', 'lastclick').time < 400) {
               B.do (x, 'rem', ['State', 'selected'], id);
               // If last click was on this picture and recent, we open canvas.
               return B.do (x, 'set', ['State', 'canvas'], B.get ('Data', 'pics', k));
            }

            B.do (x, 'set', ['State', 'lastclick'], {id: id, time: Date.now ()});

            var lastIndex = dale.stopNot (B.get ('Data', 'pics'), undefined, function (pic, k) {
               if (pic.id === last.id) return k;
            });

            if (! B.get ('State', 'shift') || lastIndex === undefined) {
               if (! B.get ('State', 'selected', id)) return B.do (x, 'set', ['State', 'selected', id], ! B.get ('State', 'selected', id));
               else                                   return B.do (x, 'rem', ['State', 'selected'], id);
            }

            // Selection with shift when the previously clicked picture is still here.
            dale.do (dale.times (Math.max (lastIndex, k) - Math.min (lastIndex, k) + 1, Math.min (lastIndex, k)), function (k) {
               B.set (['State', 'selected', B.get ('Data', 'pics', k, 'id')], true);
            });
            B.do (x, 'change', ['State', 'selected']);
         }],
         ['document', 'scroll', function (x, e) {
            var prev = B.get ('State', 'lastscroll');
            if (prev && (Date.now () - prev.time < 100)) return;
            B.do ({from: {ev: 'scroll'}}, 'set', ['State', 'lastscroll'], {time: Date.now (), y: window.scrollY});
            if (prev && prev.y > window.scrollY) return;

            var pics = B.get ('Data', 'pics');
            if (! pics) return;

            lasty = window.innerHeight;
            lasti = c ('img.pic') [B.get ('Data', 'pics').length - 1];
            if (! lasti) return;
            lasti = lasti.getBoundingClientRect ().top;

            if (lasty < lasti) return;
            B.do ({from: {ev: 'scroll'}}, 'retrieve', 'pics');
         }],
      ];
      return B.view (x, path, {listen: routes, attrs: {class: 'piclist'}}, function (x, pics) {

         if (! pics) return;
         if (pics.length === 0) {
            if (B.get ('State', 'query', 'tags').length === 0) return [
               ['h2', 'Welcome to ac;pic!'],
               ['img', {src: 'lib/icons/icon-image.svg'}],
               ['h5', 'Click the upload button to startin adding pictures.'],
               ['button', B.ev ({class: 'button upload'}, ['onclick', 'set', ['State', 'subview'], 'upload']), [['i', {class: 'ion-ios-plus-outline'}], 'Upload']],
            ];
            return;
         }

         // first row starts all with top 0, left as previous end + margin. Know when to end the row because of lack of space (width, without margin)
         // next row, throughout its width check previous row pictures bottom offset (the max one). Add margin, that's your top offset. For right it is simply margin + the previous in the row, or nothing if first in row.

         var rows = [[]];
         var MAXH = B.get ('State', 'debug', 'height') || (mobile ? 100 : 150), MARGIN = B.get ('State', 'debug', 'margin') || (mobile ? 11 : 22), OVERLAP = 0;

         return [
            ['style', [
               ['div.piclist', {
                  width: 1,
                  position: 'relative',
                  display: 'inline-block',
               }],
               ['img.pic', {
                  'border-radius': 12,
                  position: 'absolute',
               }],
               ['div.imagecontainer', {
                  position: 'absolute',
                  height: MAXH,
               }],
               ['div.imagecaption', {
                  'border-radius': 10,
                  opacity: 0,
                  width: 1,
                  height: 25,
                  padding: 5,
                  background: 'rgba(0,0,0,.8)',
                  color: 'white',
                  position: 'absolute',
                  bottom: 3,
                  left: 0,
                  'vertical-align': 'bottom',
                  'font-size': 0.7,
                  transition: 'opacity',
               }],
               ['div.imagecontainer:hover div.imagecaption', {
                  'transition-delay': '0.4s',
                  opacity: '1',
                  '-webkit-box-sizing, -moz-box-sizing, box-sizing': 'border-box'
               }],
               ['img.selected', {
                  'box-shadow': 'inset 0 0 0 1000px rgba(230,230,230,0.5)',
                  opacity: '0.5',
               }],
               ['div.blueoval', {
                  'border-radius': 0.5,
                  'width, height': 18,
                  'background-color': H.css.highlight,
                  position: 'absolute',
                  top: -6,
                  right: -6,
               }],
            ]],

            dale.do (pics, function (pic, k) {

               var date = new Date (pic.date - new Date ().getTimezoneOffset () * 60 * 1000);
               date = date.getDate () + '/' + (date.getMonth () + 1) + '/' + date.getFullYear ();

               var pich = MAXH;
               if (pic.deg === 90 || pic.deg === -90) var picw = Math.round (pic.dimh / pic.dimw * MAXH);
               else                                   var picw = Math.round (pic.dimw / pic.dimh * MAXH);

               var x;

               // If first item on row, start at the left.
               if (H.last (rows).length === 0) x = 0;
               // If there's enough room, put it on the same row.

               else if (width >= H.last (H.last (rows)) [0] + picw) {
                  x = H.last (H.last (rows)) [0];
               }
               else {
                  // If there's not enough room, push the existing row and create a new one. Start at the left.
                  rows.push ([]);
                  x = 0;
               }

               var y = (function () {
                  // If first row, position the image at the top.
                  if (rows.length === 1) return 0;

                  // If not the first on its row, y is the same as any other on its own row.
                  if (H.last (rows).length) return H.last (H.last (rows)) [1] - H.last (H.last (rows)) [3] - MARGIN;

                  // If the first on its row, take the maximum y from the previous row.
                  return Math.max.apply (null, dale.do (rows [rows.length - 2], function (pic) {
                     return pic [1];
                  }));

               }) ();

               // [rightmost x including margin, lowest y including margin, width, height, picture, index]
               H.last (rows).push ([x + picw + MARGIN, y + pich + MARGIN, picw, pich, pic, k]);
            }),
            (function () {
               return dale.do (rows, function (v) {
                  return dale.do (v, function (p) {
                     return B.view (x, ['State', 'selected'], function (x, selected) {
                        selected = (selected || {}) [p [4].id];
                        var transformOuter = selected ? 'scale(0.9, 0.9)' : '';
                        var transformInner = '';
                        if (p [4].deg ===  90) transformInner += ' rotate(90deg)';
                        if (p [4].deg === -90) transformInner += ' rotate(-90deg)';
                        if (p [4].deg === 180) transformInner += ' rotate(180deg)';
                        transformOuter = dale.do (['', '-ms-', 'webkit-', '-o-', '-moz-'], function (k) {
                           return k + 'transform: ' + transformOuter + ';';
                        }).join (' ');
                        transformInner = dale.do (['', '-ms-', 'webkit-', '-o-', '-moz-'], function (k) {
                           return k + 'transform: ' + transformInner + ';';
                        }).join (' ');
                        if (p [4].deg === 90 || p [4].deg === -90) {
                           var width = MAXH, height = p [2];
                           transformInner += ' margin-top: '  + (MAXH - p [2]) / 2 + 'px;';
                           transformInner += ' margin-left: ' + (p [2] - MAXH) / 2 + 'px;';
                        }
                        else var width = p [2], height = MAXH;
                        return ['div', {
                           class: 'imagecontainer',
                           style: transformOuter + ' left: ' + (p [0] - p [2] - MARGIN) + 'px; top: ' + (p [1] - p [3] - MARGIN) + 'px; width: ' + p [2] + 'px',
                        }, [
                           ['img', B.ev ({
                              'data-y': p [1] - p [3] - MARGIN,
                              id: 'pic' + p [4].id,
                              class: 'pic ' + H.if (selected, 'selected', ''),
                              src: H.picpath (p [4]),
                              style: transformInner + ' width: ' + width + 'px; height: ' + height + 'px',
                           }, ['onclick', 'click', 'pic', p [4].id, p [5]])],
                           ['div', {class: 'imagecaption'}, [
                              ['span', [['i', {class: 'icon ion-pricetag'}], ' ' + p [4].tags.length]],
                              ['span', {style: 'position: absolute; right: 5px'}, H.dformat (p [4].date)],
                           ]],
                           H.if (selected, ['div', {class: 'blueoval'}]),
                        ]];
                     });
                  });
               });
            }) (),
         ];
      });
   }

   // *** CANVAS VIEW ***

   Views.canvas = function (x) {
      return B.view (x, ['State', 'canvas'], {listen: [
         ['canvas', '*', function (x) {
            var action = x.path [0], pics = B.get ('Data', 'pics');
            var index = dale.stopNot (pics, undefined, function (pic, k) {
               if (pic.id === B.get ('State', 'canvas', 'id')) return k;
            });
            if (action === 'prev' && index === 0) return B.do (x, 'set', ['State', 'canvas'], H.last (pics));
            if (action === 'next' && index >= pics.length - 3) B.do (x, 'retrieve', 'pics');
            B.do (x, 'set', ['State', 'canvas'], B.get ('Data', 'pics', index + (action === 'prev' ? -1 : 1)));
            if (action === 'next') B.do (x, 'set', ['State', 'nextCanvas'], B.get ('Data', 'pics', index + 2));
         }]
      ], ondraw: function (x) {
         if (B.get ('State', 'canvas')) H.fullscreen (x);
         else                           H.fullscreen (x, true);
         B.do (x, 'set', ['State', 'showPictureInfo'], true);
      }}, function (x, pic) {
         if (! pic) return;
         return B.view (x, ['State', 'screen'], function (x, screen) {
            if (! screen) return;
            return [
               ['style', [
                  ['body', {overflow: 'hidden'}],
                  ['div.canvas', {
                     position: 'fixed',
                     'top, left': 0,
                     'height, width, min-height, min-width, max-height, max-width': 1,
                     'background': 'rgba(50,50,50,0.9)',
                     'z-index': '1',
                  }, [
                     ['div.inner', {
                        '-webkit-background-size, -moz-background-size, -o-background-size, background-size': 'cover !important',
                        'border-radius': 14,
                        position: 'relative',
                     }],
                     ['div.info', {
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        color: 'orange',
                        'font-weight': 'bold',
                        'font-size': 11,
                        'font-family': 'monospace',
                        'z-index': '3',
                     }, ['ul', {
                        margin: 'auto',
                        width: 0.5
                     }]],
                     ['img', {
                        'max-width, max-height': 0.9,
                        'z-index': '2',
                     }],
                     ['.icon', {
                        'font-size': '1.8em',
                        color: 'white',
                     }],
                     ['.ion-chevron-left', {
                        left: 10,
                     }],
                     ['.ion-chevron-right', {
                        right: 10,
                     }],
                     ['.ion-close, .ion-chevron-left, .ion-chevron-right', {
                        position: 'absolute',
                        'font-size': '40px',
                        cursor: 'pointer',
                     }],
                     ['.ion-close', {
                        right: 10,
                        top: 10,
                        'font-size': 30,
                     }],
                  ]]
               ]],
               ['div', {class: 'canvas'}, [
                  (function () {
                     var sidemargin = 20, topmargin = 10, botmargin = 30;
                     var screenw = screen.w - sidemargin * 2, screenh = screen.h - (topmargin + botmargin), picw = pic.dimw, pich = pic.dimh;
                     if (Math.max (picw, pich, 900) === 900) var thuw = picw, thuh = pich;
                     else var thuw = picw * 900 / Math.max (picw, pich), thuh = pich * 900 / Math.max (picw, pich);

                     var wratio = screenw / thuw, hratio = screenh / thuh;
                     // Respect aspect ratio; at most duplicate picture.
                     var ratio = Math.min (wratio, hratio, 2);
                     var style = 'width: ' + (ratio * thuw) + 'px; height: ' + (ratio * thuh) + 'px; ';
                     var left = (screenw - (ratio * thuw)) / 2, top = (screenh - (ratio * thuh)) / 2;
                     style += 'margin-left: ' + (left + sidemargin) + 'px; margin-top: ' + (top + topmargin) + 'px; ';
                     var picpos = c ('#pic' + pic.id), basepic = c ('#pic' + B.get ('Data', 'pics') [0].id);
                     if (picpos && basepic) {
                        picpos  = c.get ('#pic' + pic.id, 'data-y') ['data-y'];
                        basepic = c.get ('#pic' + B.get ('Data', 'pics', 0, 'id'), 'data-y') ['data-y'];
                        window.scrollTo (0, picpos - basepic + 30);
                     }
                     return [
                        ['i', B.ev ({class: 'icon ion-close'}, ['onclick', 'set', ['State', 'canvas'], undefined])],
                        ['i', B.ev ({style: 'top: ' + (Math.round (screenh / 2) - 10) + 'px', class: 'icon ion-chevron-left'},  ['onclick', 'canvas', 'prev'])],
                        ['i', B.ev ({style: 'top: ' + (Math.round (screenh / 2) - 10) + 'px', class: 'icon ion-chevron-right'}, ['onclick', 'canvas', 'next'])],
                        ['div', {class: 'inner', style: style + 'background: url(' + H.picpath (pic, 900) + ')'}, [
                           B.view (x, ['State', 'showPictureInfo'], function (x, show) {
                              if (! show) return;
                              return ['div', {class: 'info'}, [
                                 H.dformat (pic.date),
                              ]];
                           }),
                        ]],
                     ];
                  }) (),
                  B.view (x, ['State', 'nextCanvas'], function (x, next) {
                     if (next) return ['img', {style: 'width: 1px; height: 1px;', src: H.picpath (next, 900)}];
                  }),
               ]]
            ];
         });
      });
   }

   // *** TAGS VIEW ***

   Views.tags = function () {
   }

   // *** ACCOUNT VIEW ***

   Views.account = function () {
   }

}) ();
