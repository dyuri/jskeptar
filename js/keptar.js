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
      } else if (this.file.toLowerCase().match(/\.(mp4|webm|avi)/)) {
        // video
        this.showVideo(this.file);
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

  Keptar.prototype.showVideo = function (video) {
    this.showImage(video, 'video');
  };

  Keptar.prototype.showImage = function (image, type) {
    this.image = image;
    this.file = this.file || this.image;
    var $overlay = $("#imgoverlay"), path;

    if (!this.dir) {
      this.dir = this.getDir(this.file);
      this.loadDir(this.dir);
    }

    if ($overlay.length === 0) {
      $overlay = $.tmpl(this.config.overlaytmpl, {
        prev: this.getPrevImage(image),
        next: this.getNextImage(image),
        image: this.image,
        dir: this.dir
      });
      $("body").addClass('imageShown').append($overlay);
    }

    this.loadFile(image, $overlay, type);
  };

  Keptar.prototype.loadFile = function (file, $overlay, type) {
    type = type || 'image';

    if (type === 'video') {
      this.loadVideo(file, $overlay);
    } else {
      this.loadImage(file, $overlay);
    }
  };

  Keptar.prototype.hideImage = function () {
    $("#imgoverlay").remove();
    $('body').removeClass('imageShown');
  };

  Keptar.prototype.loadImage = function (image, $overlay) {
    var keptar = this,
        $prev = $overlay.find("a.prev"),
        $next = $overlay.find("a.next"),
        next = this.getNextImage(image),
        prev = this.getPrevImage(image),
        $spinner = $overlay.find(".spinner"),
        i, l;

    $spinner.show();

    if (this.dir && this.images) {
      for (i = 0, l = this.images.length; i < l; i++) {
        if (this.dir + this.images[i].image === image) {
          if (this.images[i].qvimage &&
              this.images[i].qvimage.complete) {
            this.imageLoaded(this.images[i].qvimage, $overlay);
          } else {
            this.loadQuickView(image, $overlay);
          }
        }
      }
    }

    $prev.attr("href", "#!file=" + prev);
    $next.attr("href", "#!file=" + next);

    this.loadQuickView(prev, $overlay);
    this.loadQuickView(next, $overlay);

    if (this.loadMain) {
      clearTimeout(this.loadMain);
      this.loadMain = null;
    }

    this.loadMain = setTimeout(function () {
      if (this.loadMain) {
        this.loadMain = null;
      }
      if (!this.img || (this.img.complete && this.img.naturalWidth)) {
        this.img = new Image();

        this.img.onload = function () {
          // TODO check after the last /
          // if (keptar.file && keptar.file === img.src) {
          // }
          this.loading = false;
          keptar.imageLoaded(this.img, $overlay);
          $spinner.hide();
        }.bind(this);
      }

      this.img.src = image;
    }.bind(this), 500);
    this.loading = true;

  };

  Keptar.prototype.loadVideo = function (video, $overlay) {
    var keptar = this,
        videoEl = $('<video controls autoplay height=300>'),
        $imgcnt = $overlay.find('.image'),
        $prev = $overlay.find("a.prev"),
        $next = $overlay.find("a.next"),
        next = this.getNextImage(video),
        prev = this.getPrevImage(video),
        notsupported = 'Your browser cannot play this video, you can <a href="'+video+'">download</a> it anyway.',
        i, l;

    if (this.dir && this.images) {
      for (i = 0, l = this.images.length; i < l; i++) {
        if (this.dir + this.images[i].file === video) {
          if (this.images[i].qvimage &&
              this.images[i].qvimage.complete) {
            this.imageLoaded(this.images[i].qvimage, $overlay);
          } else {
            this.loadQuickView(video, $overlay);
          }
        }
      }
    }

    $prev.attr("href", "#!file=" + prev);
    $next.attr("href", "#!file=" + next);

    this.loadQuickView(prev, $overlay);
    this.loadQuickView(next, $overlay);

    this.loading = false;
    
    videoEl.append('<source src="'+video+'">');
    videoEl.append(notsupported);

    videoEl.find('source').last().on('error', function (e) {
      $imgcnt.html(videoEl.html());
    });

    $imgcnt.html(videoEl);

    // TODO
    // - video above close overlay
    // - error message style, position
    // - video player size
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

    this.dir = dir + (dir[dir.length - 1] === '/' ? '' : '/');
    dataURL = this.dir + "images.json";
    $.getJSON(dataURL, $.proxy(this.loadDirCallback, this));
  };

  Keptar.prototype.loadDirCallback = function (data) {
    var i, l, tmpl, thumbEl, img, type,
        fragment = document.createDocumentFragment();

    this.images = [];

    for (i = 0, l = data.images.length; i < l; i++) {
      if (data.images[i].image) {
        this.images.push(data.images[i]);
      }
    }

    for (i = 0, l = this.images.length; i < l; i++) {
      img = this.images[i];
      type = img.type || 'image';
      tmpl = this.config.thumbtmpl[type] || this.config.thumbtmpl.image;
      thumbEl = $.tmpl(tmpl, {
        url: "#!file=" + this.dir + (img.file || img.image),
        title: img.title || img.name || img.file || img.image,
        thumb: this.dir + img.thumbnail
      });
      this.config.$container.append(thumbEl);
    }

  };

  Keptar.prototype.loadQuickView = function (file, $overlay) {
    var imageObj, i, l, keptar, qvLoadedCb;

    if (!this.images) {
      return;
    }

    this.dir = this.dir || this.getDir(file);
    keptar = this;

    qvLoadedCb = function (e) {
      var i, l, qvsrc, loadedsrc;

      if (keptar.loading && keptar.file) {

        for (i = 0, l = keptar.images.length; i < l; i++) {
          if (keptar.images[i].quickview && keptar.dir + (keptar.images[i].file || keptar.images[i].image) === keptar.file) {
            qvsrc = keptar.images[i].quickview.split('/').pop();
            loadedsrc = this.src.split('/').pop();
            if (qvsrc === loadedsrc) {
              keptar.imageLoaded(this, $overlay);
            }
          }
        }

      }
    };

    for (i = 0, l = this.images.length; i < l; i++) {
      if (this.images[i].quickview && this.dir + (this.images[i].file || this.images[i].image) === file) {
        imageObj = new Image();
        imageObj.src = this.dir + this.images[i].quickview;
        this.images[i].qvimage = imageObj;
        imageObj.onload = qvLoadedCb;
      }
    }
  };

  Keptar.prototype.loadQuickViews = function () {
    var imageObj, i, l;

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
    img = this.dir + (this.images[0].file || this.images[0].image);

    if (img === image) {
      return this.dir + (this.images[l - 1].file || this.images[l - 1].image);
    }

    prev = img;
    for (i = 1; i < l; i++) {
      img = this.dir + (this.images[i].file || this.images[i].image);
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
    img = this.dir + (this.images[l - 1].file || this.images[l - 1].image);

    if (img === image) {
      return this.dir + (this.images[0].file || this.images[0].image);
    }

    next = img;
    for (i = l - 2; i >= 0; i--) {
      img = this.dir + (this.images[i].file || this.images[i].image);
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
    dir = dir + (dir[dir.length - 1] === '/' ? '' : '/');

    return dir;
  };

  Keptar.CONFIG = {
    thumbtmpl: {
      image: $.template(null, '<div class="thumb"><a href="${url}"><img src="${thumb}" alt="${title}"/></a><span class="title">${title}</span></div>'),
      video: $.template(null, '<div class="thumb video"><a href="${url}"><img src="${thumb}" alt="${title}"/></a><span class="title">${title}</span></div>')
    },
    overlaytmpl: $.template(null, '<div id="imgoverlay" class="overlay"><div class="bg"></div><div class="spinner">loading...</div><div class="nav"><a class="prev" href="#!file=${prev}"><span>&lt;</span></a><a class="next" href="#!file=${next}"><span>&gt;</span></a><a class="close" href="#!file=${dir}"><span>[x]</span></a><a class="download" href="${image}"><span>Download</span></a></div><div class="image"></div></div>'),
    $container: $("#content")
  };

  ns.HashRequest = HashRequest;
  ns.Keptar = Keptar;

}(window));

