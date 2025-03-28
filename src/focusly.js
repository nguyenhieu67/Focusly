Focusly.elements = [];

function Focusly(options = {}) {
    if (!options.content && !options.templateId) {
        console.error("You must provide one of 'content' or 'templateId'.");
        return;
    }

    if (options.content && options.template) {
        options.templateId = null;
        console.warn(
            "Both 'content' adn 'templateId' are specified, and 'templateId' will be ignored"
        );
    }

    if (options.templateId) {
        options = document.querySelector(`#${options.templateId}`);

        if (!this.template) {
            console.error(`#${options.templateId} does not exist!`);
            return;
        }
    }

    this.opt = Object.assign(
        {
            destroyOnClose: true,
            footer: false,
            enableScrollLock: true,
            cssClass: [],
            closeMethods: ["button", "overlay", "escape"],
            scrollLockTarget: () => document.body,
        },
        options
    );

    this.content = this.opt.content;
    const { closeMethods } = this.opt;
    this._allowButtonClose = closeMethods.includes("button");
    this._allowBackdropClose = closeMethods.includes("overlay");
    this._allowEscapeClose = closeMethods.includes("escape");

    this._footerButtons = [];

    this._handleEscapeKey = this._handleEscapeKey.bind(this);
}

Focusly.prototype._build = function () {
    const contentNode = this.content
        ? document.createElement("div")
        : this.template.content.cloneNode(true);

    if (this.content) {
        contentNode.innerHTML = this.content;
    }

    // Create modal elements
    this._backdrop = document.createElement("div");
    this._backdrop.className = "focusly";

    const container = document.createElement("div");
    container.className = "focusly__container";

    this.opt.cssClass.forEach((className) => {
        if (typeof className === "string") {
            container.classList.add(className);
        }
    });

    if (this._allowButtonClose) {
        const closeBtn = this._createButton("&times;", "focusly__close", () =>
            this.close()
        );
        container.append(closeBtn);
    }

    this._modalContent = document.createElement("div");
    this._modalContent.className = "focusly__content";

    // Append content and elements
    this._modalContent.append(contentNode);
    container.append(this._modalContent);

    if (this.opt.footer) {
        this._modalFooter = document.createElement("div");
        this._modalFooter.className = "focusly__footer";

        this._renderFooterContent();
        this._renderFooterButtons();

        container.append(this._modalFooter);
    }

    this._backdrop.append(container);
    document.body.append(this._backdrop);
};

Focusly.prototype.setContent = function (content) {
    this.content = content;
    if (this._modalContent) {
        this._modalContent.innerHTML = this.content;
    }
};

Focusly.prototype.setFooterContent = function (html) {
    this._footerContent = html;
    this._renderFooterContent();
};

Focusly.prototype.addFooterButton = function (title, cssClass, callback) {
    const button = this._createButton(title, cssClass, callback);
    this._footerButtons.push(button);
    this._renderFooterButtons();
};

Focusly.prototype._renderFooterContent = function () {
    if (this._modalFooter && this._footerContent) {
        this._modalFooter.innerHTML = this._footerContent;
    }
};

Focusly.prototype._renderFooterButtons = function () {
    if (this._modalFooter) {
        this._footerButtons.forEach((button) => {
            this._modalFooter.append(button);
        });
    }
};

Focusly.prototype._createButton = function (title, cssClass, callback) {
    const button = document.createElement("button");
    button.className = cssClass;
    button.innerHTML = title;
    button.onclick = callback;

    return button;
};

Focusly.prototype.open = function () {
    Focusly.elements.push(this);

    if (!this._backdrop) {
        this._build();
    }

    setTimeout(() => {
        this._backdrop.classList.add("focusly--show");
    }, 0);

    // Disable scrolling
    if (this.opt.enableScrollLock) {
        const target = this.opt.scrollLockTarget();

        if (this._hasScrollbar(target)) {
            target.classList.add("focusly--no-scroll");
            const targetPadRight = parseInt(
                getComputedStyle(target).paddingRight
            );

            target.style.paddingRight =
                targetPadRight + this._getScrollbarWidth() + "px";
        }
    }

    // Attach event listeners
    if (this._allowBackdropClose) {
        this._backdrop.onclick = (e) => {
            if (e.target === this._backdrop) {
                this.close();
            }
        };
    }

    if (this._allowEscapeClose) {
        document.addEventListener("keydown", this._handleEscapeKey);
    }

    this._onTransitionEnd(this.opt.onOpen);

    return this._backdrop;
};

Focusly.prototype._handleEscapeKey = function (e) {
    const lastModal = Focusly.elements[Focusly.elements.length - 1];
    if (e.key === "Escape" && this === lastModal) {
        this.close();
    }
};

Focusly.prototype._hasScrollbar = (target) => {
    if ([document.documentElement, document.body].includes(target)) {
        return (
            document.documentElement.scrollHeight >
                document.documentElement.clientHeight ||
            document.body.scrollHeight > document.body.clientHeight
        );
    }
    return target.scrollHeight > target.clientHeight;
};

Focusly.prototype._onTransitionEnd = function (callback) {
    this._backdrop.ontransitionend = (e) => {
        if (e.propertyName !== "transform") return;
        if (typeof callback === "function") callback();
    };
};

Focusly.prototype.close = function (destroy = this.opt.destroyOnClose) {
    Focusly.elements.pop();

    this._backdrop.classList.remove("focusly--show");

    if (this._allowEscapeClose) {
        document.removeEventListener("keydown", this._handleEscapeKey);
    }

    this._onTransitionEnd(() => {
        if (this._backdrop && destroy) {
            this._backdrop.remove();
            this._backdrop = null;
            this._modalFooter = null;
        }

        // Enable scrolling
        if (!Focusly.elements.length && this.opt.enableScrollLock) {
            const target = this.opt.scrollLockTarget();

            if (this._hasScrollbar(target)) {
                target.classList.remove("focusly--no-scroll");
                target.style.paddingRight = "";
            }
        }

        if (typeof this.opt.onClose === "function") this.opt.onClose();
    });
};

Focusly.prototype.destroy = function () {
    this.close(true);
};

Focusly.prototype._getScrollbarWidth = function () {
    if (this._scrollbarWidth) return this._scrollbarWidth;

    const div = document.createElement("div");
    Object.assign(div.style, {
        overflow: "scroll",
        position: "absolute",
        top: "-9999px",
    });

    document.body.appendChild(div);
    this._scrollbarWidth = div.offsetWidth - div.clientWidth;
    document.body.removeChild(div);

    return this._scrollbarWidth;
};
