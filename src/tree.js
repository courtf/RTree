var utils = require('./utils');

function Tree (optionalOptions) {
  this.children = [ ];
  this.options  = optionalOptions || { };
  this.maxWidth = this.options.maxWidth || 3;

  if (this.options.greedy === undefined) {
    this.greedy = true;
  } else {
    this.greedy = this.options.greedy;
  }
}

Tree.prototype._arrayOfEnvelopes = function (child) {
  var array = [ ];

  if (child.leaf) {
    array.push(child.leaf);
  }

  if (Array.isArray(child)) {
    for (var i = 0; i < child.length; i++) {
      array = array.concat(this._arrayOfEnvelopes(child[i]));
    }
  } else {
    if (child.children && child.children.length) {
      array = array.concat(this._arrayOfEnvelopes(child.children));
    }
  }
  return array;
};

Tree.prototype.envelope = function () {
  return utils.envelopeFromEnvelopes(this._arrayOfEnvelopes(this));
};

Tree.prototype.depth = function (children) {
  var max_depth = 1;

  if (!children) {
    children = this.children;
  }

  if (children.length === 0) {
    return 1;
  }

  for (var i = 0; i < children.length; i++) {
    var depth = this.depth(children[i]) + 1;

    if (depth > max_depth) {
      max_depth = depth;
    }
  }

  return max_depth;
};


Tree.prototype.add = function (leaf, id) {
  // if geojson, create a real leaf
  if (leaf instanceof Tree === false) {
    var data = leaf;

    // geojson? convert to an envelope
    if (data.type) {
      data = utils.envelope(data);
    } 

    leaf = new Tree(this.options);
    leaf.leaf = data;
  }

  leaf.id = id;

  // if we already have a leaf, it's time to start creating children
  if (this.leaf) {
    var child = new Tree(this.options);
    this.leaf = null;

    this.children = [ child, leaf ];
  } else {
    // otherwise add the child
    if (this.children.length < this.maxWidth) {
      // if we aren't at the maximum, add this child
      this.children.push(leaf);
    } else {
      // otherwise we need to figure out where to put it
      var which,
          least,
          i,
          envelope = leaf.envelope();
      for (i = 0; i < this.children.length; i++) {
        if (utils.envelopeWithinEnvelope(envelope, this.children[i].envelope())) {
          // a child already has an envelope to add to
          this.children[i].add(leaf, id);
          return;
        }
      }

      // otherwise attempt to find which child is the least full, and add it there
      for (i = 0; i < this.children.length; i++) {
        if (which === undefined) {
          which = i;
          least = this.children[i].depth();
        } else {
          if (this.children[i].depth() < least) {
            least = this.children[i].depth();
            which = i;
          }
        }
      }

      this.children[which].add(leaf, id);
    }
  }
};

Tree.prototype.search = function (envelope) {
  // if there is no possibility of the tree containing the envelope, just return
  if (utils.envelopeWithinEnvelope(envelope, this.envelope()) === false) {
    return [ ];
  }

  var results = [ ];

  if (this.leaf) {
    if (utils.envelopeWithinEnvelope(envelope, this.leaf)) {
      results.push(this.id);
    }
  }

  for (var i = 0; i < this.children.length; i++) {
    var res = this.children[i].search(envelope);
    if (res.length) {
      results = results.concat(res);
    }
  }

  return results;
};

module.exports = exports = Tree;