(function (ns) {

  var HashRequest = {};

  HashRequest.parameter = function (name) {
    return this.parameters()[name];
  };

  HashRequest.parameters = function () {
    var result = {};
    var url = window.location.href;
    url = url.indexOf('#') >= 0 ? url.slice(url.indexOf('?') + 1, url.indexOf('#')) : url.slice(url.indexOf('?') + 1);
    var parameters = url.split('&');
    var i, parameter;

    for (i = 0;  i < parameters.length; i++) {
      parameter = parameters[i].split('=');
      result[parameter[0]] = parameter[1];
    }

    var hash = window.location.hash;
    var hashparameters = hash.slice(hash.indexOf('!') + 1).split(';');

    for (i = 0;  i < hashparameters.length; i++) {
      parameter = hashparameters[i].split('=');
      result[parameter[0]] = parameter[1];
    }

    return result;
  };


  var Keptar = function (config) {
    this.config = $.extend({}, Keptar.CONFIG, config);

    if ("onhashchange" in window) {
      $(window).bind("hashchange", $.proxy(this.update, this));
    }
  };

  Keptar.prototype.init = function () {
    this.update();
  };

  Keptar.prototype.update = function () {
    var file = HashRequest.parameter('file') || "",
        dir;

    if (file !== this.file) {
      this.file = file;
      if (this.file.toLowerCase().match(/\.(jpg|png|gif)/)) {
        // image
        this.showImage(this.file);
      } else {
        // directory (?)
        this.hideImage();
        dir = this.file === "" ? "" : this.file.match(/\/$/) ? this.file : this.file + "/";
        if (this.dir !== dir) {
          this.loadDir(dir);
        }
      }
    }

  };

  Keptar.prototype.showImage = function (image) {
    this.image = image;
    var $overlay = $("#imgoverlay"), path;

    if (!this.dir) {
      this.dir = this.getDir(this.image);
      this.loadDir(this.dir);
    }

    if ($overlay.length === 0) {
      $overlay = $.tmpl(this.config.overlaytmpl, {
        prev: this.getPrevImage(image),
        next: this.getNextImage(image),
        image: this.image,
        dir: this.dir
      });
      $("body").append($overlay);
    }

    this.loadImage(image, $overlay);
  };

  Keptar.prototype.hideImage = function () {
    $("#imgoverlay").remove();
  };

  Keptar.prototype.loadImage = function (image, $overlay) {
    var img = new Image(),
        keptar = this,
        $prev = $overlay.find("a.prev"),
        $next = $overlay.find("a.next"),
        next = this.getNextImage(image),
        prev = this.getPrevImage(image),
        $spinner = $overlay.find(".spinner"),
        i, l;

    $spinner.show();

    if (this.dir && this.images) {
      for (i = 0, l = this.images.length; i < l; i++) {
        if (this.dir + this.images[i].image === image && 
            this.images[i].qvimage &&
            this.images[i].qvimage.complete) {
          this.imageLoaded(this.images[i].qvimage, $overlay);
        }
      }
    }

    $prev.attr("href", "#!file="+prev);
    $next.attr("href", "#!file="+next);

    img.onload = function () {
      keptar.imageLoaded(img, $overlay);
      $spinner.hide();
    };
    img.src = image;

  };

  Keptar.prototype.imageLoaded = function (image, $overlay) {
    var $imgcnt = $overlay.find('.image'),
        mw, mh, w, h, next, prev;

    if ($imgcnt) {
      mw = $overlay.width() - 20;
      mh = $overlay.height() - 50;
      w = image.width;
      h = image.height;

      if (mw / mh < w / h) {
        h = mw / w * h;
        w = mw;
      } else {
        w = mh / h * w;
        h = mh;
      }

      image.width = w;
      image.height = h;
      // TODO fade
      // TODO center vertically
      $imgcnt.html(image);
    }
  };

  Keptar.prototype.loadDir = function (dir) {
    var dataURL;

    this.dir = dir + (dir[dir.length-1] === '/' ? '' : '/');
    dataURL = this.dir + "images.json";
    $.getJSON(dataURL, $.proxy(this.loadDirCallback, this));
  };

  Keptar.prototype.loadDirCallback = function (data) {
    var i, l, thumbEl,
        fragment = document.createDocumentFragment();

    this.images = [];

    for (i = 0, l = data.images.length; i < l; i++) {
      if (data.images[i].image) {
        this.images.push(data.images[i]);
      }
    }

    for (i = 0, l = this.images.length; i < l; i++) {
      thumbEl = $.tmpl(this.config.thumbtmpl, {
        url: "#!file=" + this.dir + this.images[i].image,
        title: this.images[i].title || this.images[i].image,
        thumb: this.dir + this.images[i].thumbnail
      });
      this.config.$container.append(thumbEl);
    }

    setTimeout($.proxy(this.loadQuickView, this), 10);

  };

  Keptar.prototype.loadQuickView = function () {
    var imgObj, i, l;

    if (!this.images) {
      return;
    }

    for (i = 0, l = this.images.length; i < l; i++) {
      if (this.images[i].quickview) {
        imageObj = new Image();
        imageObj.src = this.dir + this.images[i].quickview;
        this.images[i].qvimage = imageObj;
      }
    }

  };

  Keptar.prototype.getPrevImage = function (image) {
    var i, prev, l, img;

    this.dir = this.dir || this.getDir(image);

    if (!this.images) {
      return this.dir;
    }

    l = this.images.length;
    img = this.dir + this.images[0].image;

    if (img === image) {
      return this.dir + this.images[l - 1].image;
    }

    prev = img;
    for (i = 1; i < l; i++) {
      img = this.dir + this.images[i].image;
      if (img === image) {
        return prev;
      }
      prev = img;
    }

    return prev;
  };

  Keptar.prototype.getNextImage = function (image) {
    var i, next, l, img;

    this.dir = this.dir || this.getDir(image);

    if (!this.images) {
      return this.dir;
    }

    l = this.images.length;
    img = this.dir + this.images[l - 1].image;

    if (img === image) {
      return this.dir + this.images[0].image;
    }

    next = img;
    for (i = l - 2; i >= 0; i--) {
      img = this.dir + this.images[i].image;
      if (img === image) {
        return next;
      }
      next = img;
    }

    return next;
  };

  Keptar.prototype.getDir = function (image) {
    var dir, path;

    image = image || this.image;

    path = image.split('/');
    path.pop();
    dir = path.join('/');
    dir = dir + (dir[dir.length-1] === '/' ? '' : '/');

    return dir;
  };

  Keptar.CONFIG = {
    thumbtmpl: $.template(null, '<div class="thumb"><a href="${url}"><img src="${thumb}" alt="${title}"/></a><span class="title">${title}</span></div>'),
    overlaytmpl: $.template(null, '<div id="imgoverlay" class="overlay"><div class="bg"></div><div class="spinner">loading...</div><div class="nav"><a class="prev" href="#!file=${prev}"><span>&lt;</span></a><a class="next" href="#!file=${next}"><span>&gt;</span></a><a class="close" href="#!file=${dir}"><span>[x]</span></a><a class="download" href="${image}"><span>Download</span></a></div><div class="image"></div></div>'),
    $container: $("#content")
  };

  ns.HashRequest = HashRequest;
  ns.Keptar = Keptar;

}(window));

