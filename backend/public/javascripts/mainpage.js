  import { setInfectivityThreshold, presentData,
	   resetChecks} from './histo.js';

  document.getElementById("resetChecks").onclick = resetChecks;
  document.getElementById("select_var_label").onclick = toggleParent;
  window.onclick = closeExploreGroups;

  function toggleParent(event) {
      let target = event.target;
      showOrHideParent(target, true, true);
  }
  function showOrHideParent(widget, allowClose, allowOpen) {
      let parent = widget.parentNode;
      while (true) {
	  if (parent.className == "select_var_closed") {
	      if (allowOpen) {
		  parent.className = "select_var_open";
	      }
	      return;
	  }
	  else if (parent.className == "select_var_open") {
	      if (allowClose) {
		  parent.className = "select_var_closed";
	      }
	      return;
	  }
	  else {
	      parent = parent.parentNode;
	  }
      }	  
  }

  function isDescendentOf(widget, tag, className) {
      while (widget) {
	  if (widget.tagName == tag) {
	      if (widget.classList.contains(className)) {
		  return true;
	      }
	  }
	  widget = widget.parentNode;
      }
      return false;
  }

  function closeExploreGroups(event) {
      if (isDescendentOf(event.target, "DIV", "pickgroup")) return;
      showOrHideParent(document.getElementById("select_var_label"), true, false);
  }

  function updateThreshold(event) {
    let newValue = event.target.value;
    setInfectivityThreshold(newValue);
  }
  document.getElementById("infectivityThreshold").oninput = updateThreshold;
  setInfectivityThreshold(document.getElementById("infectivityThreshold").value);

  function updateScaleOption(event) {
      presentData();
  }
  document.getElementById("scale_absolute").onchange = updateScaleOption;
  document.getElementById("scale_shared").onchange = updateScaleOption;
