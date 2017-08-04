/**
 * Created by wagner on 20/07/17.
 */

const absoluteUrl = new RegExp('^(?:(?:[a-z]+:)?/)?/', 'i');

/* Carrega a apresentação ou mostra índice */
(function () {
    var scripts = document.getElementsByTagName('script');
    var scriptPath = scripts[scripts.length - 1].src.replace(/\/[^/]+$/, '');

    var isPrinting = function () {
        return window.location.search.match(/print-pdf/gi);
    };

    var displaySummary = function () {
        $.get('Z', function (response) {
            var summary = $('#slides').find('div');

            if (response > 9) {
                summary.css('font-size', '0.75em');
            }

            if (response > 12) {
                var n = Math.ceil(response / 12);
                summary.css('columns', n.toString());

                // noinspection FallThroughInSwitchStatementJS
                switch (n) {
                    case 2:
                    case 3:
                    case 4:
                        summary.css('font-size', '0.9em');
                    case 5:
                        summary.css('columns', (n+1).toString());
                        break;

                    case 6:
                    case 7:
                    case 8:
                        summary.css('columns', (n-1).toString());
                        summary.css('font-size', '0.65em');
                        break;

                    default:
                        summary.css('columns', (n-2).toString());
                        summary.css('font-size', '0.6em');
                }
            }

            for (var i = 1; i <= response; i++) {
                summary.append('<div><a href="' + i + '.html">Tópico ' + i + '</a>');
            }
        });
    };

    var q = urlParam('aula');
    if (q) {
        $.ajax({
            url: q + '.html',
            success: function (response) {
                $('#slides').html(
                    $(response).filter('#aula').html()
                );
                postLoadAula();
            },
            error: displaySummary
        });
    } else {
        displaySummary();
    }

    /* Helper para demonstrar HTML */
    function postLoadAula() {
        const showDemoPath = scriptPath + '/show-demo.html';

        function iframeInsert($demo, codigoHtml) {
            $demo.attr('src', showDemoPath)
                .on('load', function () {
                    var demoContents = $demo.contents();
                    demoContents.find('body').html(codigoHtml);
                    if (isPrinting()) {
                        $demo.height(demoContents.height());
                    }
                });
        }

        $('.revisao').each(function () {
            var $this = $(this);
            var $demo = $this.find('.demo');
            var $codigo = $this.find('.codigo');

            //region Coloca o HTML em $demo
            var codigoFonte = $codigo.html();
            var codigoHtml = codigoFonte;

            if ($codigo[0].hasAttribute('data-noescape')) {
                var doc = new DOMParser().parseFromString(codigoHtml, 'text/html');
                codigoHtml = doc.documentElement.textContent;
            }

            if ($demo.hasClass('par')) {
                codigoHtml = codigoFonte.trim().split(/[\r\n]+/)
                    .map(function (item) {
                        return $('<div></div>').html(item);
                    });
            }

            if ($demo.is('iframe')) {
                iframeInsert($demo, codigoHtml);
            } else {
                $demo.html(codigoHtml);
            }
            //endregion

            // region Código entre <pre><code>
            var $code = $('<code class="html" data-trim></code>');

            // Escapa código, a não ser quando houver 'noescape'
            if (!$codigo[0].hasAttribute('data-noescape')) {
                codigoFonte = codigoFonte.replace(/&(?=(?:[a-zA-Z]+|#[0-9]+);)/g, '&amp;');
            }

            // Copia todos os atributos data-* para a tag code
            $.each($codigo[0].attributes, function () {
                if (this.name.match(/^data-/)) {
                    $code.attr(this.name, '');
                }
            });

            $codigo.html($code.html(codigoFonte)
                .wrap('<pre></pre>')
                .parent());
            // endregion
        });

        $('pre > code [step]').each(function () {
            var $this = $(this);
            $this.addClass('fragment');

            var number = parseInt(this.getAttribute('step'));
            if (number >= 0) {
                this.setAttribute('data-fragment-index', number.toString());
            }

            var rel = $.trim(this.getAttribute('rel'));
            switch (rel) {
                case 'keep':
                    break;
                case 'current':
                    $this.addClass('current-visible');
                    break;
                default:
                    $this.addClass('highlight-current-blue');
            }
        });

        $('.sites dd>a').each(function () {
            $(this).after(' <small>' + this.href + '</small>');
        });

        // Ações para quando os slides estiverem carregados
        Reveal.addEventListener('ready', function (readyEvent) {
            // Redimensiona iframe
            var resizeIframe = function () {
                var $iframe = $(this);
                $iframe.height($iframe.contents().height());
            };

            // Ativa emojis
            var activateEmojis = function () {
                twemoji.parse(this, {
                    folder: 'svg',
                    ext: '.svg'
                });
            };

            // Ativa jQuery-UI dialogs
            var createDialogs = function () {
                var $dialog = $(this).find('dialog');
                if ($dialog.length === 0) {
                    return;
                }

                $dialog.each(function () {
                    var $thisDialog = $(this);

                    // Definição do link
                    var openLink;
                    var text = $thisDialog.attr('data-link');
                    if (!text) {
                        var anchor = $thisDialog.find('> a[data-link]').first();
                        if (anchor.length > 0) {
                            openLink = anchor.attr('href', '#');
                        }
                    }
                    if (!openLink) {
                        openLink = $('<a href="#"></a>').html(text || "Clique aqui");
                    }

                    // Comportamento do link
                    openLink.click(function (event) {
                        event.preventDefault();
                        $thisDialog.dialog('open');
                    });

                    // Adiciona link para abrir e ativa UI
                    $thisDialog.before(openLink)
                        .dialog({
                            modal: true,
                            closeOnEscape: false,
                            autoOpen: false,
                            width: this.getAttribute('data-width') || 800
                        });
                });
            };

            // Ativa links externos para os dialogs
            var dialogLinks = function () {
                var id = this.getAttribute('data-dialog');
                var $el = id.length > 0
                    ? $(document.getElementById(id))
                    : $(this.nextElementSibling);

                if ($el.is('dialog')) {
                    $(this).attr('href', '#').click(function (event) {
                        event.preventDefault();
                        $el.dialog('open');
                    });
                }
            };

            var inlineEmbedSVG = function () {
                $(this).find('embed[type="image/svg+xml"]')
                    .each(function () {
                        var svgPath = this.getAttribute('src').replace(/\/[^/]+$/, '');
                        var svg = this.getSVGDocument();
                        $(svg).find('image:not([xlink\\:href^=data\\:])')
                            .each(function () {
                                // noinspection JSPotentiallyInvalidUsageOfThis
                                var href = this.getAttribute('xlink:href');
                                if (!absoluteUrl.test(href)) {
                                    this.setAttribute('xlink:href', svgPath + '/' + href);
                                }
                            });
                        var $embed = $(this);
                        var $svgRoot = $(svg.rootElement)
                            .width($embed.width())
                            .height($embed.height());
                        $embed.replaceWith($svgRoot);
                    });
            };

            var slideActions = function () {
                activateEmojis.call(this);
                inlineEmbedSVG.call(this);
            };

            // Redimensiona todos os iframe.demo corretamente
            $(readyEvent.currentSlide)
                .data('processado', true)
                .each(slideActions)
                .find('iframe.demo').on('load', resizeIframe);

            // Ativa os dialogs e links para abrir
            $('a[data-dialog]').each(dialogLinks);
            createDialogs.call(document);

            // Ações caso esteja imprimindo
            if (isPrinting()) {
                // Abre todos os details
                [].forEach.call(document.getElementsByTagName('details'),
                    function (e) {
                        e.open = true;
                    });
                activateEmojis.call(document);
            }

            // Redimensiona todos os iframe.demo corretamente
            Reveal.addEventListener('slidechanged', function (event) {
                var $currentSlide = $(event.currentSlide);

                if (!$currentSlide.data('processado')) {
                    $currentSlide
                        .data('processado', true)
                        .each(slideActions)
                        .find('iframe.demo').each(resizeIframe);
                }
            });
        });
    }
})();