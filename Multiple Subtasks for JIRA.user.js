//zezwalaj na wklejanie
// ==UserScript==
// @name         Multiple Subtasks for JIRA
// @namespace    http://daqiu.pdg.pl/
// @version      0.37
// @updateURL    http://daqiu.pdg.pl/us/jira/multiple-subtasks/ms.meta.js
// @downloadURL  http://daqiu.pdg.pl/us/jira/multiple-subtasks/ms.js
// @description  Creates an additional functionality in JIRA, that allows to create many Subtasks at once.
// @author       Bartłomiej Gulis
// @match        https://xyz/build/jira/browse/*
// @grant        none
// @include      *
// ==/UserScript==

var REQUEST_URL = "https://xyz.com/jira/secure/QuickCreateIssue.jspa?decorator=none";
var REVIEW_SRC = "/jira/images/icons/issuetypes/documentation.png";
var SUBTASK_SRC = "/jira/images/icons/issuetypes/subtask_alternate.png";
var REVIEW_TYPE = "10100";
var SUBTASK_TYPE = "5";
var PRIORITY = "3";

function createMultipleSubtaskDialog() {
  drawDialog();

  var check = function() {
    if (jQuery(".description").length != 0) {
      letTheFunBegin();
    } else {
      setTimeout(check, 100);
    }
  }

  check();
}

jQuery(document).ready(function() {
  var createSubtaskButton = document.getElementById("create-subtask");
  if (createSubtaskButton.length !== 0) {
    var ul = createSubtaskButton.parentNode.parentNode;
    var li = document.createElement('li');
    li.className = "aui-list-item";
    li.innerHTML = '<a id="create-multiple-subtasks" class="aui-list-item-link" href="#">Create Multiple Sub-Tasks</a>';
    ul.appendChild(li);

    jQuery("#create-multiple-subtasks").click(createMultipleSubtaskDialog);
  }
});

var drawDialog = function() {
  var c = {
    parentIssueId: JIRA.Issue.getIssueId()
  };
  JIRA.Forms.createSubtaskForm(c).asDialog({
    windowTitle: function() {
      return JIRA.Dialog.getIssueActionTitle("Create Subtask")
    },
    trigger: document.createElement("a"),
    id: "create-subtask-dialog"
  }).show();


};

var letTheFunBegin = function() {
  modifyRest();
  removeUselessCrap();
  addSomeStuff();
  changeDialogDimensions();
  fillGlobalFields();
  jQuery(".new-subtask-fields").append(getAddSubtaskTemplate());

  createDefaultSubtasks();
  jQuery('.form-body').scrollTop(0);
};

var changeDialogDimensions = function() {
  var dialog = jQuery('#create-subtask-dialog');
  var extendBy = 250; //how many pixels wider the popup should be

  var currWidth = parseInt(dialog.css('width')); // actually returns "123px", but parseInt parses that to a number just fine
  var currMargin = parseInt(dialog.css('margin-left'));

  dialog.css('width', currWidth + extendBy + "px");
  dialog.css('margin-left', currMargin - (extendBy / 2) + "px");
};

var fillGlobalFields = function() {
  var id = jQuery('#customfield_10700-val').text().trim();
  jQuery('#customfield_10700').val(id);
};

// default tasks
var createDefaultSubtasks = function() {
  var storyID = "S-" + jQuery('#customfield_10700').val();

  var subtasks = {
    "0": {
      "type": SUBTASK_TYPE,
      "summary": storyID + ": Code Review",
      "estimate": "0h",
      "desc": ""
    },
    "1": {
      "type": SUBTASK_TYPE,
      "summary": storyID + ": Doku",
      "estimate": "2h",
      "desc": ""
    },
    "2": {
      "type": SUBTASK_TYPE,
      "summary": storyID + ": Deployment",
      "estimate": "1h 30m",
      "desc": ""
    },
    "3": {
      "type": SUBTASK_TYPE,
      "summary": storyID + ": Coordination",
      "estimate": "0d",
      "desc": ""
    },
    "4": {
      "type": SUBTASK_TYPE,
      "summary": storyID + ": E2E Tests",
      "estimate": "0d",
      "desc": ""
    }
  };


  jQuery.each(subtasks, function(index) {
    addSubtask(subtasks[index].type, subtasks[index].summary, subtasks[index].estimate, subtasks[index].desc);
  });

};

var getTokens = function() {
  var tokens = {
    parentIssueId: jQuery('input[name=parentIssueId]').val(),
    atl_token: jQuery('input[name=atl_token]').val(),
    formToken: jQuery('input[name=formToken]').val()
  };

  return tokens;
};

var addTotalEstimate = function() {
  var d = document.createElement('div');
  jQuery(d).addClass("total-estimate");

  var l = document.createElement('label');
  jQuery(l).css({
    "padding": "4px 0 4px 575px",
    "font-weight": "bold"
  }).text("0d");
  jQuery(d).append(l);

  jQuery(".form-body").append(d);
};

var addSubtaskCreator = function() {
  var d = document.createElement('div');
  jQuery(d).addClass("new-subtask-fields");
  jQuery(".form-body").append(d);
};

var removeUselessCrap = function() {

  // Remove all fields
  jQuery(".form-body .content").empty();

  // don't rememeber what it is
  jQuery(".qf-form-operations").remove();

  // Create another checkbox
  jQuery(".qf-create-another").remove();

  // Issue type
  jQuery("label[for=issuetype]").parent().remove();

  // Create button
  jQuery("#create-issue-submit").remove();
};

var modifyRest = function() {
  // just some useless label modifications
  var title = jQuery(".jira-dialog-heading h2");
  var titleText = title.text();
  title.text("Create Multiple Subtasks " + titleText.slice(titleText.indexOf(":"), titleText.length));

  moveGeneralNodes();

  // TODO Create Button function
};

var addSomeStuff = function() {
  addTotalEstimate();
  addSubtaskCreator();
  addCreateSubtasksButton();
};

var addCreateSubtasksButton = function() {
  var a = document.createElement('a');
  jQuery(a).addClass("aui-button aui-button-primary").attr('id', 'createButton').text("Create Subtasks").click(function() {

    if (validateGlobalInfo() && validateSubtasks()) {
      submitSubtasks();
    } else {
      alert("Not so fast. First, fill in all fields.");
    }
  });
  jQuery("div.buttons .cancel").before(a);
};

var submitSubtasks = function() {
  // Validate all already added subtasks
  if (validateSubtasks() == false) {
    alert("You shall not pass! Fix your red errors first.")
    return;
  }

  var isOk = false;

  jQuery(".form-body .content").children(".field-group").each(function(node) {
    isOk = sendRequest(jQuery(this).find(".aui-ss-entity-icon").val(), jQuery(this).find(".summary").val(), jQuery(this).find(".estimate").val(), jQuery(this).find(".desc").val());

    if (isOk === true) {
      jQuery(this).remove();
      setNumbers();
    }
  });

  if (isOk === true) {
    alert("Well done - all subtasks have been created!");
    //jQuery(".cancel").trigger('click');
  } else {
    alert("Oops... Something went wrong. Check your subtasks and try again.");
  }
};

var sendRequest = function(t, s, e, d) {
  var pIssId = jQuery("input[name=parentIssueId]").val();
  var projectID = jQuery(".jira-system-avatar").attr('id');
  var rep = jQuery('#header-details-user-fullname').attr('data-username');
  var ass = jQuery("#assignee option:selected").val();
  var id = jQuery("#customfield_10700").val();
  var tokens = getTokens();

  // request data. Needs to be adapted to match project-specific requirements
  var d = {
    summary: s,
    description: d,
    atl_token: tokens.atl_token,
    formToken: tokens.formToken,
    issuetype: t,
    pid: projectID,
    parentIssueId: pIssId,
    reporter: rep,
    assignee: ass,
    customfield_10700: id,
    priority: PRIORITY,
    timetracking_originalestimate: e,
    timetracking_remainingestimate: e
  };


  d["components"] = jQuery("#components option:selected").map(function() {
    return jQuery(this).val();
  }).get();

  d["fixVersions"] = jQuery("#fixVersions option:selected").map(function() {
    return jQuery(this).val();
  }).get();

  d["labels"] = jQuery("#labels option:selected").map(function() {
    return jQuery(this).val();
  }).get();

  jQuery.ajaxSetup({});

  console.log(d);
  var request = jQuery.ajax({
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'pl-PL,pl;q=0.8,en-US;q=0.6,en;q=0.4,ru;q=0.2,de;q=0.2',
    },
    url: REQUEST_URL,
    type: "POST",
    data: d,
    async: false
  });

  var isOk = true;

  request.done(function(msg) {
    console.log("SUCCESS - created subtask");
  });

  request.fail(function(jqXHR, textStatus) {
    console.log("FAILED - didn't create subtask");
    isOk = false;
  });

  return isOk;
};

var activateCreateButton = function() {
  if (validateGlobalInfo() && validateSubtasks()) {
    jQuery("#createButton").css({
      "display": "none"
    });
  } else {
    jQuery("#createButton").css({
      "display": "none"
    });
  }
};

var validateGlobalInfo = function() {
  console.log(jQuery("#reporter option:selected").val());
  console.log(jQuery("#assignee option:selected").val());
  console.log(jQuery("#components option:selected").val());
  console.log(jQuery("#fixVersions option:selected").val());

  //if (!jQuery("#reporter option:selected").val() || jQuery("#reporter option:selected").val().length == 0)
  //            return false;
  if (!jQuery("#assignee option:selected").val() || jQuery("#assignee option:selected").val().length == 0)
    return false;
  if (!jQuery("#components option:selected").val() || jQuery("#components option:selected").val().length == 0)
    return false;
  //if (!jQuery("#fixVersions option:selected").val() || jQuery("#fixVersions option:selected").val().length == 0)
  //            return false;
  return true;
};

var validateSubtasks = function() {
  var isOk = true;

  jQuery(".form-body .content").children(".field-group").each(function(node) {
    if (validateSubtask(jQuery(this).find(".summary"), jQuery(this).find(".estimate")) == false) {
      isOk = false;
    }
  });

  return isOk;
};

var validateSubtask = function(summary, estimate) {
  isSummaryOk = validateSummary(summary);
  isEstimateOk = validateEstimate(estimate);
  return isSummaryOk && isEstimateOk;
};

var validateSummary = function(summary) {
  if (summary.val().length > 255 || summary.val().length == 0) {
    summary.css("border", "2px solid #d04437");
    return false;
  } else {
    summary.css("border", "1px solid #ccc");
    return true;
  }
};

var validateEstimate = function(estimate) {
  tokens = estimate.val().split(' ');
  for (var i = 0; i < tokens.length; i++) {
    if (/^[0-9]*(\.[0-9]{1,}|[0-9]*)[d|h|m]{1}$/.test(tokens[i]) == false) {
      estimate.css("border", "2px solid #d04437");
      return false;
    } else {
      estimate.css("border", "1px solid #ccc");

    }
  }
  return true;
};

var moveGeneralNodes = function() {
  var newParentClass = "qf-field-issuetype";
  var nodes = ["components", "fixVersions", "reporter", "assignee", "labels", "customfield_10700"];
  nodes.forEach(function(node) {
    moveNode(node, newParentClass);
  });
};

var moveNode = function(labelFor, newParentClass) {
  var fieldGroupElement = jQuery("label[for=" + labelFor + "]").parent();
  fieldGroupElement.detach();

  jQuery('.' + newParentClass).append(fieldGroupElement);
};

var getNewSubtaskTemplate = function() {
  var d = getSubtaskTemplate();

  // action
  var a = document.createElement('a');
  jQuery(a).attr('href', '#').addClass('delete-subtask icon icon-delete').css("margin-left", "10px").attr("title", "[Remove Subtask]").click(function() {
    jQuery(this).closest('div').remove();
    setNumbers();
  });

  d.appendChild(a);

  d.appendChild(createDescTextarea());

  return d;
};

var getAddSubtaskTemplate = function() {
  var d = getSubtaskTemplate();

  // action
  var a = document.createElement('a');
  jQuery(a).attr('href', '#').addClass('delete-subtask icon icon-add').css("margin-left", "10px").attr("title", "[Add Subtask]").click(function() {
    var parent = jQuery(this).parent();
    var type = parent.find(".aui-ss-entity-icon");
    var summary = parent.find(".summary");
    var estimate = parent.find(".estimate");
    var desc = parent.find(".desc");

    addSubtask(type.val(), summary.val(), estimate.val(), desc.val());
    summary.val("S-" + jQuery('#customfield_10700').val() + ": ");
    estimate.val("");
    desc.val("");
  });
  d.appendChild(a);

  d.appendChild(createDescTextarea());

  jQuery(d).find(".summary").css({
    "border": "1px dashed #999",
    "color": "#999",
    "font-style": "italic"
  }).val("S-" + jQuery('#customfield_10700').val() + ": ");

  jQuery(d).find(".estimate").css({
    "border": "1px dashed #999",
    "color": "#999",
    "font-style": "italic"
  });

  jQuery(d).find(".desc").css({
    "border": "1px dashed #999",
    "color": "#999",
    "font-style": "italic"
  });

  return d;
};


var createDescTextarea = function() {
  var t = document.createElement('textarea');
  jQuery(t).css('float', 'right').css('display', 'inline').attr('placeholder', 'Description...').addClass('desc').css('resize', 'vertical').css('width', '250px');
  return t;
}

var addSubtask = function(type, summary, estimate, desc) {
  var d = getNewSubtaskTemplate();

  var s = type == SUBTASK_TYPE ? SUBTASK_SRC : REVIEW_SRC;

  jQuery(d).find(".summary").val(summary);
  jQuery(d).find(".estimate").val(estimate);
  jQuery(d).find(".desc").val(desc);
  setSubtaskType(jQuery(d).find(".aui-ss-entity-icon"), type);

  validateSubtask(jQuery(d).find(".summary"), jQuery(d).find(".estimate"));

  jQuery(".form-body .content").append(d);

  var height = jQuery('.issue-setup-fields').height() + jQuery('.form-body .content').height() + jQuery('.total-estimate').height() + jQuery('.new-subtask-fields').height()
  jQuery('.form-body').scrollTop(height);

  setNumbers();
};

var setNumbers = function() {
  var totalEstimate = 0;
  jQuery(".form-body .content").children(".field-group").each(function(node) {
    jQuery(this).find("label[for=number]").text(node + 1);
    totalEstimate += parseFloat(parseEstimate(jQuery(this).find(".estimate").val()), 10);
  });
  jQuery(".total-estimate").find("label").text(totalEstimate + "d");
};

var parseEstimate = function(estimate) {

  if (estimate.length == 0)
    return 0;

  var tokens = estimate.split(' ');
  if (tokens.length > 1) {
    var res = 0;
    for (var i = 0; i < tokens.length; i++) {
      res += parseFloat(parseEstimate(tokens[i]));
    }
    return res;
  }

  var lastChar = estimate.substr(estimate.length - 1);
  var number = estimate.substr(0, estimate.length - 1);

  if (lastChar === "d")
    return number;

  if (lastChar === "h")
    return number / 8;

  if (lastChar === "m")
    return number / 480;

  return 0;

};

var changeSubtaskType = function(img) {
  if (jQuery(img).val() === SUBTASK_TYPE)
    setSubtaskType(img, REVIEW_TYPE);
  else
    setSubtaskType(img, SUBTASK_TYPE);
};

var setSubtaskType = function(img, type) {
  if (type === SUBTASK_TYPE)
    jQuery(img).attr({
      "src": SUBTASK_SRC,
      "title": "Sub-task",
      "value": SUBTASK_TYPE
    });
  else
    jQuery(img).attr({
      "src": REVIEW_SRC,
      "title": "Review",
      "value": REVIEW_TYPE
    });
};

var getSubtaskTemplate = function() {
  // container
  var d = document.createElement('div');
  jQuery(d).addClass("field-group");

  // number
  var l = document.createElement("label");
  jQuery(l).attr("for", "number");
  d.appendChild(l);

  // task type
  var a = document.createElement("a");
  jQuery(a).attr("href", "#");
  jQuery(a).css({
    "vertical-align": "middle"
  });
  jQuery(a).click(function() {
    changeSubtaskType(jQuery(this).find('img'));
  });
  var i = document.createElement("img");
  changeSubtaskType(i);
  jQuery(i).addClass("aui-ss-entity-icon");
  jQuery(i).css({
    "margin-right": "10px"
  });
  a.appendChild(i);
  d.appendChild(a);

  // summary
  var s = document.createElement("input");
  jQuery(s).addClass("text summary");
  jQuery(s).attr({
    "type": "text",
    "placeholder": "Summary"
  });
  jQuery(s).css({
    "max-width": "389px",
    "margin-right": "10px"
  });
  jQuery(s).keyup(function() {
    validateSummary(jQuery(this));
  });
  d.appendChild(s);

  // estimate
  var e = document.createElement("input");
  jQuery(e).addClass("text short-field estimate");
  jQuery(e).attr({
    "type": "text",
    "placeholder": "Estimate"
  });
  jQuery(e).keyup(function() {
    setNumbers();
    validateEstimate(jQuery(this));
  });
  d.appendChild(e);

  return d;
};
