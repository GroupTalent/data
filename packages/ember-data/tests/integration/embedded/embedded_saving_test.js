var store, Adapter, adapter;
var Post, Comment, User, App;
var attr = DS.attr;

var get = Ember.get, set = Ember.set;
/*global $*/

module("Embedded Saving", {
  setup: function() {
    App = Ember.Namespace.create({ name: "App" });

    Comment = App.Comment = DS.Model.extend({
      title: attr('string'),
      post: DS.belongsTo('Post')
    });

    Post = App.Post = DS.Model.extend({
      title: attr('string'),
      comments: DS.hasMany(Comment)
    });

    Adapter = DS.RESTAdapter.extend();

    Adapter.map(Post, {
      comments: { embedded: 'always' }
    });

    adapter = Adapter.create();

    store = DS.Store.create({
      adapter: adapter
    });
  },

  teardown: function() {
    store.destroy();
    App.destroy();
  }
});

asyncTest("Modifying the parent in a different transaction", function() {
  adapter.ajax = function(url, type, hash) {
    equal(url, '/posts/1');
    equal(type, 'PUT');
    equal(hash.data.post.comments.length, 1);

    setTimeout(function() {
      hash.data.post.comments[0].title = 'wtf';
      hash.success.call(hash.context, hash.data);
      start();
    });
  };

  adapter.load(store, Post, {
    id: 1,
    title: 'I cannot wait for Ember.Component to be implemented.',
    comments: [{id: 2, title: 'yes!'}]
  });

  var post = store.find(Post, 1);

  var t = store.transaction();
  t.add(post);

  set(post, 'title', "Hopefully soon.");

  t.commit();
});

asyncTest("Adding a new embedded record to an unsaved record: Both records use the same POST request.", function() {
  adapter.ajax = function(url, type, hash) {
    equal(url, '/posts');
    equal(type, 'POST');
    equal(hash.data.post.comments.length, 1);

    var promise = $.Deferred();
    setTimeout(function() {
      hash.success.call(hash.context);
      start();
      promise.resolve();
    });

    return promise;
  };

  var transaction = store.transaction();
  var post = transaction.createRecord(Post, {
    title: 'This post is unsaved'
  });

  post.get('comments').createRecord({ title: 'This embedded record is also unsaved' });

  transaction.commit();
});

