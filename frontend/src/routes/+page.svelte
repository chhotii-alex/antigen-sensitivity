<script>

import * as util from './util.js';
import Histogram from './Histogram.svelte';
import Pyramid from './Pyramid.svelte';
import PValueLegend from './PValueLegend.svelte';

let isLoading = true;
let errorState = false;

let gData = {
    populations: [],
    tooManyQueries: false,
    splitDescription: '',
};

let selectedGroupLabel = '';
$: selectedGroup = gData.populations.find(pop => pop.label == selectedGroupLabel);

import { onMount } from 'svelte';
onMount(async () => {
    fetch(URLforEndpoint("assays"))
        .then(response => response.json())
        .then(data => loadAssayOptions(data))
        .catch((error) => {
          errorState = true;
          console.log(error);
        });
    fetch(URLforEndpoint("variables"))
        .then(response => response.json())
        .then(data => loadVariableOptions(data))
        .catch((error) => {
          errorState = true;
          console.log(error);
        });
});

import { urlPrefix } from "./server_url.js";
function URLforEndpoint(endpointName) {
    return `${urlPrefix}/api/${endpointName}`;
}

let infectivityThreshold = 5;
let scaleOption = "scale_absolute";

let exploreGroupsOpen = false;
function toggleGroupsOpen() {
    exploreGroupsOpen = !exploreGroupsOpen;
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
    if (isDescendentOf(event.target, "DIV", "select_var")) return;
    if (isDescendentOf(event.target, "FIELDSET", "exploreGroupsOpen")) return;
    exploreGroupsOpen = false;
}

let assayOptions = {};

function loadAssayOptions(data) {
    assayOptions = {};
    let options = data.items;
    for (let item of options) {
        let id = item.id;
        assayOptions[id] = item;
    }
    let randomElement = options[Math.floor(Math.random() * options.length)];
    selectedAssay = randomElement.id;
}

let variablesDataStructure = null;

$: if (variablesDataStructure) {
    doQuery(variablesDataStructure);
}

function loadVariableOptions(data) {
    let options = data.items;
    for (let item of options) {
        Object.defineProperty(item, "checked", {
           get() {
              return this._checked;
           },
           set(newValue) {
              if (newValue == this._checked) return;
              for (let subItem of this.splits) {
                  subItem._checked = newValue;
              }
              this._checked = newValue;
           }
        });       
        let splits = item.splits;
        for (let subItem of splits) {
           subItem.owner = item;
           if (subItem._checked) {
              subItem.owner._checked = true;
           }
           Object.defineProperty(subItem, "checked", {
              get() {
                  return this._checked;
              },
              set(newValue) {
                  if (newValue == this._checked) return;
                  this._checked = newValue;
                  if (this._checked) {
                      this.owner._checked = true;
                  }
                  else {
                      let allOff = true;
                      for (let subItem of this.owner.splits) {
                          if (subItem._checked) {
                              allOff = false;
                              break;
                          }
                      }
                      if (allOff) {
                          this.owner._checked = false;
                      }
                  }
               }
            });
        }
    }
    variablesDataStructure = data;
}

function resetChecks() {
    for (let item of variablesDataStructure.items) {
        item.checked = false;
    }
    variablesDataStructure = variablesDataStructure;
}

function doQuery(variablesDataStructure) {
    isLoading = true;
    let url = URLforEndpoint("data");
    url += '/viralloads?';

    if (variablesDataStructure) {
        for (let item of variablesDataStructure.items) {
            for (let subItem of item.splits) {
                if (subItem.checked) {
                    url += `${item.id}[]=${subItem.value}&`;
                }
            }
        }
    }
    fetch(url)
        .then(response => response.json())
        .then(data => loadData(data))
        .catch((error) => {
          errorState = true;
          console.log(error);
        });
}

function loadData(data) {
    if (!data.populations.find( e => e.label == selectedGroupLabel)) {
        let firstPossibleGroup = data.populations.find(d => d.shouldPlot);
        if (firstPossibleGroup) {
            selectedGroupLabel = firstPossibleGroup.label;
        }
        else {
            selectedGroupLabel = '';
        }
    }
    gData = data;
    isLoading = false;
}

function hasSignificantDifferences(info, alpha=0.00125) {
    for (let i = 1; i < info.length; ++i) {
        for (let j = 0; j < i; ++j) {
            let d = {};
            d.pvalue = info[i].comparisons[j];
            if (d.pvalue == null) {
                continue;
            }
            if (d.pvalue < alpha) {
                return true;
            }
        }
    }
    return false;
}

$: groupCommentSpace = (gData.populations.length < 4);

let selectedAssay = 'none';

let lod = 8;
let ld50 = 5;

$: adjustLOD(lod);
$: adjustLD50(ld50);

function adjustLOD(lod) {
   if (lod <= ld50+0.05) {
      ld50 = lod - 0.1;
   }
}

function adjustLD50(ld50) {
   if (lod <= ld50+0.05) {
     lod = ld50 + 0.1;
   }
}

$: showingAntigenPerformance = true;

function applyAntigenTest(lod, ld50, assay, pop, infectivityThreshold) {
    if (!pop) return {};
    if (!pop.data) return {};
    pop.catagories["negatives"] = "Antigen Negatives";
    pop.catagories["positives"] = "Antigen Positives";
    let coef;
    if (assay) {
        coef = assay.coef;
        ld50 = assay.ld50;
        if (ld50 == undefined) {
            let intercept = assay.intercept;
            ld50 = -(intercept/coef);
        }
    }
    else {
        coef = Math.log(19)/(lod - ld50);
    }
    for (let bin of pop.data) {
        let p = 1/(1 + Math.exp(-coef * (bin.viralLoadLog - ld50)))
        bin["positives"] = p*bin["count"];
        bin["negatives"] = bin["count"] - bin["positives"];
    }
    
    // Confusion matrix for classifying infectivity
    pop.tp = 0;
    pop.fn = 0;
    pop.fp = 0;
    pop.tn = 0;
    // Confusion matrix for classifying presence of virus at all
    pop.allPositives = 0;
    pop.allNegatives = 0;
    for (let bin of pop.data) {
        pop.allPositives += bin.positives;
        pop.allNegatives += bin.negatives;
        if (bin.viralLoadLog >= infectivityThreshold) {
            pop.tp += bin.positives;
            pop.fn += bin.negatives;
        }
        else {
            pop.tn += bin.negatives;
            pop.fp += bin.positives;
        }
    }
    if ((pop.allPositives + pop.allNegatives) > 0) {
        pop.sensitivity = pop.allPositives/(pop.allPositives + pop.allNegatives);
    }
    if ((pop.tp + pop.fn) > 0) {
        pop.infectivitySensitivity = pop.tp/(pop.tp+pop.fn);
    }
    else {
        pop.infectivitySensitivity = null;
    }
    if ((pop.tn + pop.fp) > 0) {
        pop.infectivitySpecificity = pop.tn/(pop.tn+pop.fp);
    }
    else {
        pop.infectivitySpecificity = null;
    }
    return {sensitivity: pop.sensitivity, infectivitySensitivity: pop.infectivitySensitivity,
         infectivitySpecificity: pop.infectivitySpecificity};
}

$: ({sensitivity, infectivitySensitivity, infectivitySpecificity} = applyAntigenTest(lod, ld50, assayOptions[selectedAssay],
                                   selectedGroup, infectivityThreshold));

let highlightedGroupLabel;

function mouseEnterAction(event) {
    highlightedGroupLabel = event.target.getAttribute("app_group_name");
}

function mouseLeaveAction(event) {
    if (event.target.getAttribute("app_group_name") == highlightedGroupLabel) {
        highlightedGroupLabel = null;
    }
}

let numberFormatter = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 4 });

</script>

<div on:click={closeExploreGroups} class="all_content">
   {#if !errorState}
      <div id="loading" class="hideLoading" class:isLoading >
        <img src="virus.gif" >
      </div>
    {/if}
    <div id="menu">
        <ul id="menu">
            <li>
                <a class="no-change" rel="external" href="https://www.arnaoutlab.org/index.html#top" target="_blank" >Arnaout Laboratory for Immunomics and Informatics</a>
            </li>
            <ul id="topmenu">
                <li>
                    <a  rel="external" href="https://www.arnaoutlab.org/index.html#publications" target="_blank" >Publications</a>
                </li>
                <li>
                    <a  rel="external" href="https://www.arnaoutlab.org/index.html#team" target="_blank" >Team</a>
                </li>
                <li>
                    <a rel="external" href="https://www.arnaoutlab.org/index.html#contribute" target="_blank" >Contribute</a>
                </li>
            </ul>
        </ul>
    </div>

    <header>
        <h1 class="page-top" >Learning from COVID&#8209;19 Viral Loads</h1>
        <h2>How viral loads vary&mdash;or don&apos;t&mdash;across patients can predict the performance
                 of antigen tests in different groups</h2>

        <p class="body_text" >
      COVID&#8209;19 test results are usually reported simply as
      &ldquo;positive&rdquo; or &ldquo;negative.&rdquo; However, the
      amount of virus a person produces&mdash;<span class="bold">the
      viral load</span>&mdash;can vary. As clinical microbiologists
      responsible for COVID&#8209;19 testing at a major medical center,
      we <a class="link" href="https://www.biorxiv.org/content/10.1101/2022.06.20.496929v1">estimated</a>
      viral load for over <span class="bold">40,000 patients</span>
      who had a positive PCR test at our hospital from 2020-2023 so
      you can see how viral loads vary&mdash;or
      don&apos;t&mdash;across age, sex, and so on.
            <span class="bold">
                Please explore for yourself!
            </span>
        </p>
    </header>

    {#if errorState}
        <h1 class="errorText" >
          <em ><strong>Sorry, an error occured. Please try re-loading the page.</strong></em>
        </h1>
    {:else}
    <div >
      <div class="pick_group_padding" >
        <div class="pickgroup has_bottom_line">
            <fieldset class:exploreGroupsOpen >
                <legend id="select_var_label" class="select_var_label"
                       on:click={toggleGroupsOpen}>Explore groups
                    <svg height="20px" width="20px" overflow="visible" >
                        <g transform="translate(4,8)">
                            <line x1="0" y1="0" x2="6" y2="6" stroke="black" stroke-width="3" stroke-linecap="round" />
                            <line x1="6" y1="6" x2="0" y2="12" stroke="black" stroke-width="3" stroke-linecap="round" />
                        </g>
                    </svg>
                </legend>
                <div id="select_var" class="select_var" >
                    <div id="select_var_checks">
                        <strong>Group</strong>
                        <button id="resetChecks" class="bluebutton" on:click={resetChecks}>Reset</button>
                    </div>
                    {#if variablesDataStructure}
                        {#each variablesDataStructure.items as item (item.id)}
                            <div class="group_variable_div">
                                <input type="checkbox" id={item.id} class="variablename"
                                        bind:checked={item.checked}  />
                                <label for={item.id} class="variablename" >
                                    {item.displayName}
                                </label>
                                <br/>
                                {#each item.splits as subItem (subItem.value)}
                                    <input type="checkbox" id={subItem.value} class="valuename"
                                          bind:checked={subItem.checked} />
                                    <label for={subItem.value} class="valuename" >
                                        {subItem.valueDisplayName}
                                    </label>
                                    <br/>
                                {/each}
                            </div>
                        {/each}
                    {/if}
                </div>
            </fieldset>
        </div>
     </div>
        <div class="max80em print-page-top">
            <h1 id="comparison_title" class="comparisons" >
                {#if (gData.populations.length == 1) }
                    Real-world Viral Loads, 2020&ndash;Present
                {/if}
                {#if (gData.populations.length > 1) }
                    Viral Loads
                    {#if !(gData.splitDescription) }
                      <span class="acrossbetween">
                        In
                       </span>
                    {/if}
                    {#if gData.splitDescription }
                        {gData.splitDescription}
                    {:else}
                        These {gData.populations.length} Groups
                    {/if}
                {/if}
            </h1>
        </div>
        <div class="max80em">
            <p class="too_many_groups">
              {#if gData.tooManyVariables}
                <strong>Did not attempt
                  {#if gData.populations.length}
                      all
                  {/if}
                  queries.
                </strong>
                Too many checkboxes selected at once. Please uncheck some checkboxes above.
              {:else if gData.tooManyQueries}
                Displaying data for the first eight groups. Click subsets of the checkboxes to see
                  more (eight at a time).
              {/if}
            </p>
        </div>
        <div class="max80emSplit" >
          <div class="histogram all_groups" >
            <Histogram info={gData.populations} joy={true} highlightOne={true}
                           highlightedGroupLabel={highlightedGroupLabel}
                   y_scale={scaleOption} infectivityThreshold={infectivityThreshold} />
              </div>
            <div class="meantext">
                <div id="pvalue_text" >
                    <div id="commentary">
                        {#each gData.populations as pop (pop.label)}
                            <div class="groupcomment legend"
                                    class:groupCommentSpace
                                    app_group_name={pop.label}
                                     on:mouseenter={mouseEnterAction}
                                     on:mouseleave={mouseLeaveAction} >
                                {#if pop.shouldPlot}
                                  <svg class="legendmark" height="1em" width="1em"
                                    fill={pop.colors.count[1]}
                                    stroke={pop.colors.count[0]}
                                    stroke-width="4" 
                                  >
                                     <rect width="100%"
                                         height="100%" />
                                  </svg>
                                {/if}
                                <p class="legendtext" >
                                    <span class="comm_part1" >
                                         The mean viral load across    
                                    </span>
                                    <span class="comm_part2" style={`color: ${pop.colors.negatives[0]}`}>
                                          &sim;{numberFormatter.format(pop.count)}
                                        {pop.label.trim()}
                                    </span>
                                    <span class="comm_part3" >
                                        was
                                    </span>
                                    <span class="comm_part4" style={`color:  ${pop.colors.negatives[0]}`}>
                                        {@html util.formatSciNot(pop.mean, 1)}
                                        copies/mL.
                                    </span>
                                </p>
                            </div>
                        {/each}
                    </div>
                    {#if (gData.populations.length == 2) }
                        <div class="conclusiontext" >
                            <span class="vl_prefix" >
                                <strong>Statistics.</strong>
                                The probability of viral loads for two groups differing
                                this much by chance is                                
                            </span>
                            <span class="pvalue">
                                {@html util.formatSciNot(gData.populations[1].comparisons[0], 1)}
                            </span><span class="period">.</span>
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <div class="max80emSplit rightContentFirst print-page-top" >
            <div class="pyramid_placeholder">
              {#if (gData.populations.length > 2) }
                  <Pyramid info={gData.populations} />
              {/if}
            </div>
            {#if (gData.populations.length > 2) }
                <div class="plegend" >
                    <p class="plegend_text">
                        <span class="statistics">Statistics.</span>
                        Each entry in this triangle plot shows the p-value for the difference in viral load between the indicated groups.
                    </p>
                    <p class="plegend_text">
                        Brighter entries indicate smaller p-values and therefore  more statistically significant differences.
                        Note that differences can be highly significant, but still small. Scale for p-values:
                    </p>
                    <PValueLegend />
                    <p class="plegend_text">
                       See the main text for <a href="#statistics">
                          more regarding this statistical approach.
                       </a>
                    </p>
                </div>
            {/if}
        </div>
   </div>

      <header class="print-page-top" >
        <h3>How do viral loads vary across patient groups?</h3>
        <p class="body_text">
      COVID&#8209;19 viral loads can vary <a class="link"
      href="https://www.biorxiv.org/content/10.1101/2022.06.20.496929v1">a
      billion fold</a> from person to person. Within each person, it
      starts low, reaches a peak (often preceding symptoms), and then
      falls again as the infection comes under control. Based on our
      observations, we hypothesized that most groups exhibit the same
      range of viral loads. If true, then antigen tests
      <a href="#antigentests">(see below)</a>,
      which a person can take at home, would be equally effective for
      most groups. If not, then certain groups might require separate
      trials to get the most benefit from antigen tests.
        </p>
        <p class="body_text">
            A generous grant from the
            <a class="link" href="https://reaganudall.org/">Reagan-Udall Foundation for
        the FDA</a> allowed us to test this hypothesis. We used fully
        anonymized data to protect patient privacy. Instead of simply
        reporting our own observations, we have made the results
        available here to everyone, so you can explore and compare
        whatever group or groups that may be of interest to you. This
        can include comparison of complex subgroups, such as
        healthy-weight vs. overweight >60-year-old inpatients or sick-
        vs. well-appearing patients with presumed early vs. delta
        vs. omicron variants.
        </p>
    
    </header>
   <div class="antigen_text">
       <p class="body_text">
       <a class="anchor-inner" id="statistics"></a>
      To help you assess whether between-group differences are significant, we
      calculated the p-value for each pair of groups according to a
      statistical test called the <a class="link"
      href="https://en.wikipedia.org/wiki/Mann%E2%80%93Whitney_U_test">Mann-Whitney
      U test (MWU)</a>. MWU is a commonly used test when data do not
      follow a bell-shaped curve. The MWU p-value measures how likely
      it is that two distributions&mdash;here, the distributions of
      viral loads for each pair of groups&mdash;are drawn from the
      same underlying distribution. A large p-value means the two
      groups in the pair are statistically indistinguishable; a low
      value mean they differ more than would be expected by chance.
        </p>
  </div>
   <div class="antigen_text print-page-top">  
        <h3>How can specific COVID&#8209;19 antigen tests be expected to perform on the
             above groups?</h3>
        <p class="body_text">Antigen tests are less sensitive than PCR
      tests but have the advantage that they can be self-administered
      and used at home. For the antigen tests in the pulldown menu
      below on the left, the antigen test and a PCR test have been run
      at the same time on the same people. This real-world data
      can <span class="bold">predict how well these antigen tests will
      perform</span> on different groups <span class="bold">without
      having to run time-consuming and expensive trials</span> on each
      group selected above. <span class="bold">Select each group using
      the radio buttons below to compare expected antigen-test
      performance.</span>
        </p>
        <p class="body_text">When paired trials that directly compare an
        antigen test to PCR have not been performed, we can still
        predict how sensitive an antigen test is for detecting
        contagiousness by using the antigen test’s limit of detection
        (LOD), which you can set below on the right. If the antigen
        test you’re looking for does not appear in the
        dropdown, <span class="bold">set the LOD to see how sensitive
        your antigen test is.</span>
        </p>
    </div>
    <div class="pickanti has_bottom_line">
       <fieldset class="select_test no_border">
           <legend class="select_label_antigen" >Antigen Test</legend>
           <select class="select_antigen" name="antigenTest" id="antigenTest"
                  bind:value={selectedAssay} >
               {#each Object.keys(assayOptions) as assayId (assayId) }
                   <option value={assayId}>
                       {@html assayOptions[assayId].displayName}
                   </option>
               {/each}
               <option value="none">other test...</option>
           </select>
       </fieldset>
       {#if !assayOptions[selectedAssay]}
        <div class="select_lod">
         <fieldset class="no_border" >
           <legend>Limit of detection (LOD):</legend>
           Viral load level at which test is positive 95% of the time
           <input type="range" min="1.1" max="11" step="0.1"
                 bind:value={lod} 
                 class="slider" id="lod_slider" />
               <span>
                   10<sup>{lod.toFixed(1)}</sup> copies of viral mRNA/mL
               </span>
         </fieldset>
         <fieldset class="no_border" >
           <legend>50% detection threshold:</legend>
           Viral load level at which test is positive 50% of the time
           <input type="range" min="1" max="10.9" step="0.1"
                 bind:value={ld50} 
                 class="slider" id="lod_slider" />
               <span>
                   10<sup>{ld50.toFixed(1)}</sup> copies of viral mRNA/mL
               </span>
         </fieldset>
        </div>
       {/if}
    </div>
    <div class="max80em hidden_style print-page-top" class:showingAntigenPerformance id="antihisto">
        <a class="anchor-inner" id="antigentests"></a>
        <div class="antihisto_title">
            <h1 class="antigen">
                Performance of
                {#if assayOptions[selectedAssay]}
                    {@html assayOptions[selectedAssay].displayName}
                {:else}
                    other antigen test  
                {/if}
            </h1>
        </div>
   </div>
   <div class="max80em hidden_style" class:showingAntigenPerformance >
        <div class="group_radio" id="group_radio" >
            {#if gData.populations.filter(d => d.shouldPlot).length > 1}
                {#each gData.populations.filter(d => d.shouldPlot) as pop (pop.label)}
                    <span>
                        <input type="radio" id={pop.label} name="group_for_performance"
                                 bind:group={selectedGroupLabel} value={pop.label} />
                        <label for={pop.label} class="radio_button_label" >{pop.label}</label>
                        <br class="splitradio" />
                    </span>
                {/each}
            {/if}
        </div>
   </div>
   <div class="max80emSplit hidden_style" class:showingAntigenPerformance >
        {#if selectedGroup}
          <div class="histogram one_group">
            <Histogram info={[selectedGroup]} catagories={["negatives", "positives"]}
                  joy={false} highlightOne={false}
                infectivityThreshold={infectivityThreshold} />
          </div>
            <div class="performance_commentary">
              <p class="cm">
                For detecting
                <strong>
                    contagious
                </strong>
                cases of COVID-19
                in
                {#if gData.populations.length == 1}
                    all
                {/if}
                <span class="ag_test_group"
                   style={`color: ${selectedGroup.colors.negatives[0]}`}>
                    {selectedGroup.label}
                </span>
                {#if (infectivitySensitivity != undefined) } 
                    the
                    <span class="senspec_label">
                        sensitivity
                    </span>
                    is
                    <span class="senspec_value">
                        {infectivitySensitivity.toFixed(2)}
                    </span>
                {/if}
                {#if (infectivitySpecificity != undefined) && (infectivitySensitivity != undefined) }
                    and 
                {/if}
                {#if (infectivitySpecificity != undefined) }
                    the
                    <span class="senspec_label">
                        specificity
                    </span>
                    is
                    <span class="senspec_value">
                        {infectivitySpecificity.toFixed(2)}.
                    </span>
                {/if}
              </p>
              <p class="cm">
                For detecting the
                <strong>
                   presence
                </strong>
                of any amount of COVID-19 virus
                in
                {#if gData.populations.length == 1}
                    all
                {/if}
                <span class="ag_test_group"
                   style={`color: ${selectedGroup.colors.negatives[0]}`}>
                    {selectedGroup.label}
                </span>
                {#if (sensitivity != undefined) }
                   the
                   <span class="senspec_label">
                       sensitivity
                   </span>
                   is
                   <span class="senspec_value">
                       {sensitivity.toFixed(2)}.
                   </span>
                {/if}
              </p>
                {#each ["positive", "negative"] as cat}
                  <div class="anti_legend legend" >
                    <svg height="1em" width="1em"
                       class="legendmark"
                      fill={util.addAlpha(selectedGroup.colors[`${cat}s`][0],0.4)}
                      stroke={selectedGroup.colors[`${cat}s`][0]}
                      stroke-width="4" >
                        <rect width="100%" height="100%" />
                    </svg>
                    <p class="legendtext"> 
                        Predicted to test {cat} on the antigen test
                    </p>
                  </div>
                {/each}
            </div>
        {/if}
    </div>
    <div class="antigen_text">
      <details id="moresettings">
        <summary>Show More Settings</summary>
        <div class="indent">
            Scaling on y axes:
            <input type="radio" bind:group={scaleOption} id="scale_absolute" name="y_scale"
              value={"scale_absolute"}>
            <label for="scale_absolute">Normalize fractions across groups (recommended)</label>
            <input type="radio" bind:group={scaleOption} id="scale_shared" name="y_scale"
               value={"scale_shared"}>
            <label for="scale_shared">No normalization</label>
        </div>
        <div class="indent">
            <label for="infectivityThreshold" name="infectivityThreshold">
                Infectivity Threshold (copies viral mRNA/mL):
            </label>
            <input type="range" min="0" max="11" bind:value={infectivityThreshold}
                 class="slider" id="infectivityThreshold">
        </div>
      </details>
    </div>
    {/if}
    <footer>
        <h3>How did we estimate SARS-CoV-2 contagiousness?</h3>
        <p class="body_text">
      Managing a pandemic requires being able to determine not only
      who is infected, but who is likely to be infectious
      or <span class="bold">contagious</span>. Note that
      contagiousness depends on many factors, including proximity,
      exposure time, and protection (both physical barriers such as
      masks and immunological defenses such as vaccination or recent
      infection), and can vary over time as viral load rises and
      falls.
        </p>
        <p class="body_text">
      Fortunately, <a class="link"
      href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9293398/">in
      vitro experiments</a>&mdash;growing a patient's virus on cells
      in a petri dish&mdash;can provide a clinically useful lower
      bound: if virus at a given viral load fails to replicate under
      these ideal laboratory conditions, in which there is no immune
      response or medication to combat it, that viral load is highly
      unlikely to result in infectious transmission under imperfect
      real-world conditions. Therefore, a person with a viral load
      below this threshold can be reasonably considered to be
      non-contagious.
        </p>

      <!--
        <h3>Can I download the data?</h3>
        <p class="body_text">
      Yes. Fully de-identified data is available for
      download <a class="link" href="dataset">here</a>, in case you wish to carry
      out your own analyses. If you do, please <span class="bold">cite
      us</span> as described below. Potentially identifiable
      information such as dates is <span class="bold">not</span>
      available.
        </p>
        -->
        
        <h3>Who did this work?</h3>
        <p class="body_text">
      This work was led by Ramy Arnaout and carried out by Alex
      Morgan, Elisa Contreras, Michie Yasuda, Sanjucta Dutta, James
      E. Kirby, and Stefan Riedel at the Beth Israel Deaconess Medical
      Center and Don Hamel and Phyllis Kanki at the Harvard T.H. Chan
      School of Public Health, both in Boston, Massachusetts,
      USA.
        </p>    
        <h3>How do I cite this work?</h3>
        <p class="body_text">
            Arnaout, R.A. et al. Learning from COVID-19 Viral Loads. 2023
        </p>
        <h3 class="print-page-top" >What if I have other questions, comments, or suggestions?</h3>
        <p class="body_text">We appreciate your feedback. Please email us
            at
            <a class="email" href="mailto:rarnaout@bidmc.harvard.edu">rarnaout@bidmc.harvard.edu</a>.
        </p>
    </footer>
</div>

<style>

.errorText {
  color: red;
  margin: auto;
  border: 3px solid red;
  border-radius: 4em;
  max-width: 16em;
}

.page-top {
    padding-top: 120px;
}
.print-page-top {
    padding-top: 0.5em;
    break-before: page;
}
@media only print {
   .print-page-top {
       padding-top: 120px;
   }
}
@media only print {
    .savebuttons {
        display: none;
    }
}

/* Needs the :global directive to penetrate into @html strings: */
:global(sup.exponent) {
    vertical-align: baseline;
    position: relative;
    top: -0.4em;
}

.histogram {
    width: 100%;
}
.all_groups {
    grid-area: max80emLeftContent;
    min-height: 500px;
    max-height: 800px; 
}
.one_group {
    grid-area: max80emLeftContent;
    aspect-ratio: 1.618 / 1;
}
@media only print {
    .histogram {
        page-break-after: always;
    }
}
.groupcomment {
    font-size: 18px;
    line-height: 1.2em;
    padding-bottom: 0.7em;
}
.groupCommentSpace {
    padding-bottom: 1.5em;
}
@media only screen and (max-width: 72em) {
  .groupcomment {
    font-size: 14px;
    padding-bottom: 0.3em;
  }
}

.pick_group_padding {
    padding-left: 70px;
    padding-right: 70px;
}
@media only screen and (max-width: 600px) {
  .pick_group_padding {
    padding-left: 30px;
    padding-right: 0px;
  }
}
.performance_commentary {
   margin-left: 10px;
}

.hideLoading {
    display: none;
}
.isLoading {
    display : block;
}

/*  Toggle open/close behavior.
    This div is not displayed by default.
    However, when the parent has the exploreGroupsOpen class,
    the display: block style overrides.
*/
div#select_var {
    display: none;
}
.exploreGroupsOpen > div#select_var {
    display: block;
}
fieldset {
    border: none;
}
fieldset.exploreGroupsOpen {
    border: 2px solid;
    padding-left: 30px;
    padding-right: 40px;
    padding-bottom: 50px;
    background-color: #eee
}
.exploreGroupsOpen svg {
    transform: translateY(6px) translateX(6px) rotate(0.25turn);
}

.showingBlock {
    display:block;
}

.showingAntigenPerformance {
    display: grid;
}
.anti_legend {
    padding-top: 1em;
}

.spacer {
    padding-top: 2em;
}

.legend {
    display: grid;
    grid-template-columns: 1.75em 1fr;
    grid-template-areas:
       "legendmark legendtext";
}
.legendmark {
    grid-area: legendmark;
    padding: 0.25em; 
}
.legendtext {
    grid-area: legendtext;
}
.senspec_value {
   font-weight: 600;
}
.cm {
  padding-bottom: 0.5em;
}

</style>
