// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
cr.plugins_.CJSAds = function(runtime)
{
	this.runtime = runtime;
};

/////////////////////////////////////
// C2 plugin
(function ()
{
	var input_text = "";
	var products_list = [];
	var requested_score = 0;
	
	var bannerPosition = 0;
	var preloadingBanner = false;
	var bannerReady = false;
	var preloadingFullscreen = false;
	var fullscreenReady = false;
	
	var pluginProto = cr.plugins_.CJSAds.prototype;
		
	/////////////////////////////////////
	// Object type class
	pluginProto.Type = function(plugin)
	{
		this.plugin = plugin;
		this.runtime = plugin.runtime;
	};

	var typeProto = pluginProto.Type.prototype;

	typeProto.onCreate = function()
	{
	};

	/////////////////////////////////////
	// Instance class
	pluginProto.Instance = function(type)
	{
		this.type = type;
		this.runtime = type.runtime;
	};
	
	var instanceProto = pluginProto.Instance.prototype;

	instanceProto.onCreate = function()
	{
		this.isShowingBanner = false;
		this.isShowingFullscreen = false;
		this.triggerProduct = "";
		this.socialService = null;
		this.socialServiceAvailable = false;
		this.storeServiceAvailable = (this.runtime.isCocoonJs && typeof CocoonJS["Store"]["nativeExtensionObjectAvailable"] !== "undefined");
		this.storeManaged = (this.properties[0] !== 1);
		this.storeSandboxed = (this.properties[1] !== 0);
		this.onConsumePurchaseFailedTransactionId = "";
		this.onConsumePurchaseCompleted = "";
		
		var self = this;
		
		if (this.runtime.isCocoonJs)
		{
			CocoonJS["App"]["onTextDialogFinished"].addEventListener(function(text) {
				input_text = text;
				self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnKeyboardOK, self);
			});

			CocoonJS["App"]["onTextDialogCancelled"].addEventListener(function() {
					self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnKeyboardCancelled, self);
			});
		
			CocoonJS["Ad"]["onBannerShown"].addEventListener(function ()
			{
				self.isShowingBanner = true;
				self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnBannerShown, self);
			});
			
			CocoonJS["Ad"]["onBannerReady"].addEventListener(function ()
			{
				bannerReady = true;
				
				if (!preloadingBanner)
				{
					CocoonJS["Ad"]["setBannerLayout"](bannerPosition);
					CocoonJS["Ad"]["showBanner"]();
				}
			});
			
			CocoonJS["Ad"]["onFullScreenShown"].addEventListener(function ()
			{
				self.isShowingFullscreen = true;
				self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnFullscreenShown, self);
			});
			
			CocoonJS["Ad"]["onFullScreenHidden"].addEventListener(function ()
			{
				self.isShowingFullscreen = false;
				self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnFullscreenHidden, self);
			});
			
			CocoonJS["Ad"]["onFullScreenReady"].addEventListener(function ()
			{
				fullscreenReady = true;
				
				if (!preloadFullScreen)
					CocoonJS["Ad"]["showFullScreen"]();
			});
			
			if (this.storeServiceAvailable)
			{				
				CocoonJS["Store"]["onProductPurchaseCompleted"].addEventListener(function (purchase)
				{
					self.triggerProduct = purchase["productId"];
					self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnPurchaseComplete, self);
					
					CocoonJS["Store"]["addPurchase"](purchase);
					CocoonJS["Store"]["consumePurchase"](purchase["transactionId"], purchase["productId"]);
					CocoonJS["Store"]["finishPurchase"](purchase["transactionId"]);
				});
				
				CocoonJS["Store"]["onConsumePurchaseFailed"].addEventListener(function(transactionId, errorMessage)
				{
					this.onConsumePurchaseFailedTransactionId = transactionId;
					self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.onConsumePurchaseFailed, self);
				});

				CocoonJS["Store"]["onConsumePurchaseCompleted"].addEventListener(function(transactionId)
				{
					this.onConsumePurchaseCompleted = transactionId;
					self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.onConsumePurchaseCompleted, self);
				});

				CocoonJS["Store"]["onProductPurchaseFailed"].addEventListener(function (productId, errorMsg)
				{
					self.triggerProduct = productId;
					self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnPurchaseFail, self);
				});
				
				CocoonJS["Store"]["onProductPurchaseStarted"].addEventListener(function (productinfo)
				{
					self.triggerProduct = productinfo["productId"];
					self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnPurchaseStart, self);
				});
				
				CocoonJS["Store"]["onProductsFetchStarted"].addEventListener(function ()
				{
					self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.onProductsFetchStarted, self);
				});
				CocoonJS["Store"]["onProductsFetchFailed"].addEventListener(function ()
				{
					self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.onProductsFetchFailed, self);
				});
				CocoonJS["Store"]["onProductsFetchCompleted"].addEventListener(function (products)
				{
					self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.onProductsFetchCompleted, self);
				});

				CocoonJS["Store"]["requestInitialization"]({
					"managed": this.storeManaged,
					"sandbox": this.storeSandboxed
				});
				
				CocoonJS["Store"]["start"]();

			}
			
			this.socialService = CocoonJS["SocialGaming"]["GameCenter"];
			this.socialServiceAvailable = !!this.socialService["nativeExtensionObjectAvailable"];
			
			this.socialService["onRequestLoginSucceed"].addEventListener(function () {
				self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnGCLoginSuccess, self);
			});
			
			this.socialService["onRequestLoginFailed"].addEventListener(function () {
				self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnGCLoginFail, self);
			});
			
			this.socialService["onLogout"].addEventListener(function () {
				self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnGCLogout, self);
			});
			
			this.socialService["onRequestUserScoreSucceed"].addEventListener(function (userInfo) {
				requested_score = userInfo["score"] || 0;
				self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnGCScoreReceived, self);
			});
			
			this.socialService["onRequestUserScoreFailed"].addEventListener(function () {
				self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnGCScoreUnavailable, self);
			});
			
			this.socialService["onSubmitUserScoreSucceed"].addEventListener(function () {
				self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnGCScoreSubmitSuccess, self);
			});
			
			this.socialService["onSubmitUserScoreFailed"].addEventListener(function () {
				self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnGCScoreSubmitFail, self);
			});
			
			this.socialService["onLeaderboardViewSucceed"].addEventListener(function () {
				self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnGCLeaderboardOpen, self);
			});
			
			this.socialService["onLeaderboardViewClosed"].addEventListener(function () {
				self.runtime.trigger(cr.plugins_.CJSAds.prototype.cnds.OnGCLeaderboardClose, self);
			});
		}
	};

	//////////////////////////////////////
	// Conditions
	function Cnds() {};

	Cnds.prototype.IsShowingBanner = function ()
	{
		return this.isShowingBanner;
	};
	
	Cnds.prototype.IsCocoonJS = function ()
	{
		return this.runtime.isCocoonJs;
	};
	
	Cnds.prototype.OnBannerShown = function ()
	{
		return true;
	};
	
	Cnds.prototype.OnFullscreenShown = function ()
	{
		return true;
	};
	
	Cnds.prototype.OnFullscreenHidden = function ()
	{
		return true;
	};
	
	Cnds.prototype.IsShowingFullscreen = function ()
	{
		return this.isShowingFullscreen;
	};
	
	Cnds.prototype.IsStoreAvailable = function ()
	{
		if (this.runtime.isCocoonJs)
			return this.storeServiceAvailable && CocoonJS["Store"]["canPurchase"]();
		else
			return false;
	};
	
	Cnds.prototype.OnPurchaseStart = function (productid)
	{
		return this.triggerProduct === productid;
	};
	
	Cnds.prototype.OnPurchaseComplete = function (productid)
	{
		return this.triggerProduct === productid;
	};
	
	Cnds.prototype.OnPurchaseFail = function (productid)
	{
		return this.triggerProduct === productid;
	};
	
	Cnds.prototype.onProductsFetchStarted = function(){
		return true;
	}

	Cnds.prototype.onConsumePurchaseFailed = function(){
		return true;
	}

	Cnds.prototype.onProductsFetchCompleted = function(){
		return true;
	}

	Cnds.prototype.onProductsFetchFailed = function(){
		return true;
	}

	Cnds.prototype.IsProductPurchased = function (productid)
	{
		if (this.runtime.isCocoonJs)
			return CocoonJS["Store"]["isProductPurchased"](productid);
		else
			return false;
	};
	
	Cnds.prototype.OnKeyboardCancelled = function ()
	{
		return true;
	};
	
	Cnds.prototype.OnKeyboardOK = function ()
	{
		return true;
	};
	
	Cnds.prototype.IsGCAvailable = function ()
	{
		return this.socialServiceAvailable;
	};
	
	Cnds.prototype.IsGCLoggedIn = function ()
	{
		if (!this.socialServiceAvailable)
			return false;
			
		return this.socialService["isLoggedIn"]();
	};
	
	Cnds.prototype.OnGCLoginSuccess = function ()
	{
		return true;
	};
	
	Cnds.prototype.OnGCLoginFail = function ()
	{
		return true;
	};
	
	Cnds.prototype.OnGCLogout = function ()
	{
		return true;
	};
	
	Cnds.prototype.OnGCScoreReceived = function ()
	{
		return true;
	};
	
	Cnds.prototype.OnGCScoreUnavailable = function ()
	{
		return true;
	};
	
	Cnds.prototype.OnGCScoreSubmitSuccess = function ()
	{
		return true;
	};
	
	Cnds.prototype.OnGCScoreSubmitFail = function ()
	{
		return true;
	};
	
	Cnds.prototype.OnGCLeaderboardOpen = function ()
	{
		return true;
	};
	
	Cnds.prototype.OnGCLeaderboardClose = function ()
	{
		return true;
	};
	
	pluginProto.cnds = new Cnds();
	
	//////////////////////////////////////
	// Actions
	function Acts() {};
	
	Acts.prototype.ShowBanner = function (layout_)
	{
		if (!this.runtime.isCocoonJs)
			return;
		
		bannerPosition = (layout_ === 0 ? CocoonJS["Ad"]["BannerLayout"]["TOP_CENTER"] : CocoonJS["Ad"]["BannerLayout"]["BOTTOM_CENTER"]);
		preloadingBanner = false;
		
		if (bannerReady)
		{
			CocoonJS["Ad"]["setBannerLayout"](bannerPosition);
			CocoonJS["Ad"]["showBanner"]();
		}
		else
		{
			CocoonJS["Ad"]["preloadBanner"]();
		}
	};
	
	Acts.prototype.ShowFullscreen = function ()
	{
		if (!this.runtime.isCocoonJs)
			return;
		
		preloadingFullscreen = false;
		
		if (fullscreenReady)
			CocoonJS["Ad"]["showFullScreen"]();
		else
			CocoonJS["Ad"]["preloadFullScreen"]();
	};
	
	Acts.prototype.HideBanner = function ()
	{
		if (!this.runtime.isCocoonJs)
			return;
		
		CocoonJS["Ad"]["hideBanner"]();
		this.isShowingBanner = false;
	};
	
	Acts.prototype.PreloadBanner = function ()
	{
		if (!this.runtime.isCocoonJs)
			return;
		
		preloadingBanner = true;
		CocoonJS["Ad"]["preloadBanner"]();
	};
	
	Acts.prototype.PreloadFullscreen = function ()
	{
		if (!this.runtime.isCocoonJs)
			return;
		
		preloadingFullscreen = true;
		CocoonJS["Ad"]["preloadFullScreen"]();
	};
	
	Acts.prototype.RefreshBanner = function ()
	{
		if (!this.runtime.isCocoonJs)
			return;
		
		CocoonJS["Ad"]["refreshBanner"]();
	};
	
	Acts.prototype.RefreshFullscreen = function ()
	{
		if (!this.runtime.isCocoonJs)
			return;
		
		CocoonJS["Ad"]["refreshFullScreen"]();
	};
	
	Acts.prototype.Purchase = function (productid)
	{
		if (!this.runtime.isCocoonJs)
			return;
		
		CocoonJS["Store"]["purchaseProduct"](productid);
	};

	Acts.prototype.fetchProductsFromStore = function (products)
	{
		if (!this.runtime.isCocoonJs)
			return;
		
		CocoonJS["Store"]["fetchProductsFromStore"](products.split(","));
	};
	
	Acts.prototype.restorePurchases = function ()
	{
		if (this.runtime.isCocoonJs)
			return CocoonJS["Store"]["restorePurchases"]();
	};

	Acts.prototype.PurchasePreview = function (productid)
	{
		if (!this.runtime.isCocoonJs)
			return;
		
		CocoonJS["Store"]["purchaseProductModalWithPreview"](productid);
	};
	
	Acts.prototype.RestorePurchases = function ()
	{
		if (!this.runtime.isCocoonJs)
			return;
		
		CocoonJS["Store"]["restorePurchases"]();
	};
	
	Acts.prototype.PromptKeyboard = function (title_, message_, initial_, type_, canceltext_, oktext_)
	{
		if (!this.runtime.isCocoonJs)
			return;
		
		var typestr = ["text", "num", "phone", "email", "url"][type_];
		
		CocoonJS["App"]["showTextDialog"](title_, message_, initial_, typestr, canceltext_, oktext_);
	};
	
	Acts.prototype.UpdateProductsList = function ()
	{
		if (!this.runtime.isCocoonJs)
			return;
		
		if (!CocoonJS["Store"]["canPurchase"]())
			return;
		
		products_list = CocoonJS["Store"]["getProducts"]();
	};
	
	Acts.prototype.GCLogin = function ()
	{
		if (!this.socialServiceAvailable || this.socialService["isLoggedIn"]())
			return;
		
		this.socialService["requestLogin"]();
	};
	
	Acts.prototype.GCLogout = function ()
	{
		if (!this.socialServiceAvailable || !this.socialService["isLoggedIn"]())
			return;
		
		this.socialService["requestLogout"]();
	};
	
	Acts.prototype.GCSubmitScore = function (score_, leaderboard_)
	{
		if (!this.socialServiceAvailable || !this.socialService["isLoggedIn"]())
			return;
		
		this.socialService["submitUserScore"](score_, leaderboard_);
	};
	
	Acts.prototype.GCRequestScore = function (leaderboard_)
	{
		if (!this.socialServiceAvailable || !this.socialService["isLoggedIn"]())
			return;
		
		this.socialService["requestUserScore"](leaderboard_);
	};
	
	Acts.prototype.GCOpenLeaderboard = function (leaderboard_)
	{
		if (!this.socialServiceAvailable || !this.socialService["isLoggedIn"]())
			return;
		
		this.socialService["showLeaderboardView"](leaderboard_);
	};
	
	pluginProto.acts = new Acts();
	
	//////////////////////////////////////
	// Expressions
	function Exps() {};
	
	Exps.prototype.InputText = function (ret)
	{
		ret.set_string(input_text);
	};
	
	Exps.prototype.ProductCount = function (ret)
	{
		ret.set_int(products_list.length);
	};
	
	Exps.prototype.ProductDescription = function (ret, index)
	{
		index = Math.floor(index);
		
		if (index < 0 || index >= products_list.length)
		{
			ret.set_string("");
			return;
		}
		
		ret.set_string(products_list[index]["description"]);
	};
	
	Exps.prototype.ProductLocalizedPrice = function (ret, index)
	{
		index = Math.floor(index);
		
		if (index < 0 || index >= products_list.length)
		{
			ret.set_string("");
			return;
		}
		
		ret.set_string(products_list[index]["localizedPrice"]);
	};
	
	Exps.prototype.ProductPrice = function (ret, index)
	{
		index = Math.floor(index);
		
		if (index < 0 || index >= products_list.length)
		{
			ret.set_string("");
			return;
		}
		
		ret.set_string(products_list[index]["price"]);
	};
	
	Exps.prototype.ProductAlias = function (ret, index)
	{
		index = Math.floor(index);
		
		if (index < 0 || index >= products_list.length)
		{
			ret.set_string("");
			return;
		}
		
		ret.set_string(products_list[index]["productAlias"]);
	};
	
	Exps.prototype.ProductID = function (ret, index)
	{
		index = Math.floor(index);
		
		if (index < 0 || index >= products_list.length)
		{
			ret.set_string("");
			return;
		}
		
		ret.set_string(products_list[index]["productId"]);
	};
	
	Exps.prototype.ProductTitle = function (ret, index)
	{
		index = Math.floor(index);
		
		if (index < 0 || index >= products_list.length)
		{
			ret.set_string("");
			return;
		}
		
		ret.set_string(products_list[index]["title"]);
	};
	
	Exps.prototype.GameCenterScore = function (ret)
	{
		ret.set_float(requested_score);
	};
	
	pluginProto.exps = new Exps();
	
}());