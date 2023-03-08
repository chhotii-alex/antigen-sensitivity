<script>

import * as util from './util.js';
import Histogram from './Histogram.svelte';
import Pyramid from './Pyramid.svelte';

let isLoading = true;

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
        .then(data => loadAssayOptions(data));
    fetch(URLforEndpoint("variables"))
        .then(response => response.json())
        .then(data => loadVariableOptions(data));
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
        .then(data => loadData(data));
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
$: if (selectedAssay) selectAntigenTest();

function selectAntigenTest() {
    if (selectedAssay != 'none') {
        lod = -1;
    }
}

let lod = -1;
$: if (lod >= 0) setLOD();

function setLOD() {
    if (lod >= 0) {
        selectedAssay = 'none';
    }
}
$: showingAntigenPerformance = ((lod >= 0) || (selectedAssay != 'none'));

function applyAntigenTest(lod, assay, pop, infectivityThreshold) {
    if (!pop) return {};
    pop.catagories["negatives"] = "Antigen Negatives";
    pop.catagories["positives"] = "Antigen Positives";
    if (lod >= 0) {
        for (let bin of pop.data) {
            if (bin.viralLoadLog < lod) {
                bin["negatives"] = bin["count"];
                bin["positives"] = 0;
            }
            else {
                bin["negatives"] = 0;
                bin["positives"] = bin["count"];
            }
        }
    }
    else if (assay) {
        let coef = assay.coef;
        let intercept = assay.intercept;
        for (let bin of pop.data) {
            let p = 1/(1 + Math.exp(-coef * bin.viralLoadLog - intercept))
            bin["positives"] = p*bin["count"];
            bin["negatives"] = bin["count"] - bin["positives"];
        }
    }
    pop.tp = 0;
    pop.fn = 0;
    pop.fp = 0;
    pop.tn = 0;
    for (let bin of pop.data) {
        if (bin.viralLoadLog >= infectivityThreshold) {
            pop.tp += bin.positives;
            pop.fn += bin.negatives;
        }
        else {
            pop.tn += bin.negatives;
            pop.fp += bin.positives;
        }
    }
    if ((pop.tp + pop.fn) > 0) {
        pop.sensitivity = pop.tp/(pop.tp+pop.fn);
    }
    else {
        pop.sensitivity = null;
    }
    if ((pop.tn + pop.fp) > 0) {
        pop.specificity = pop.tn/(pop.tn+pop.fp);
    }
    else {
        pop.specificity = null;
    }
    return {sensitivity: pop.sensitivity, specificity: pop.specificity};
}

$: ({sensitivity, specificity} = applyAntigenTest(lod, assayOptions[selectedAssay],
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
    <div id="loading" class="hideLoading" class:isLoading >
        <img src="virus.gif" >
    </div>

    <div id="menu">
        <ul id="menu">
            <li>
                <a class="no-change" href="https://www.arnaoutlab.org/#top">Arnaout Laboratory for Immunomics and Informatics</a>
            </li>
            <ul id="topmenu">
                <li>
                    <a href="https://www.arnaoutlab.org/#publications">Publications</a>
                </li>
                <li>
                    <a href="https://www.arnaoutlab.org/#team">Team</a>
                </li>
                <li>
                    <a href="https://www.arnaoutlab.org/#contribute">Contribute</a>
                </li>
            </ul>
        </ul>
    </div>

    <header>
        <h1>Learning from COVID-19 Viral Loads</h1>

        <h2>How viral loads vary&mdash;or don&apos;t&mdash;across patients can predict the performance
                 of antigen tests in different groups</h2>

        <p class="body_text" >
      COVID-19 test results are usually reported simply as
      &ldquo;positive&rdquo; or &ldquo;negative.&rdquo; However, the
      amount of virus a person produces&mdash;<span class="bold">the
      viral load</span>&mdash;can vary. As clinical microbiologists
      responsible for COVID-19 testing at a major medical center,
      we <a class="link" href="https://www.biorxiv.org/content/10.1101/2022.06.20.496929v1">estimated</a>
      viral load for over <span class="bold">40,000 patients</span>
      who had a positive PCR test at our hospital from 2020-2023 so
      you can see how viral loads vary&mdash;or
      don&apos;t&mdash;across age, sex, and so on.
        </p>
        <h3>How do viral loads vary across patient groups?</h3>
        <p class="body_text">
      COVID-19 viral loads can vary <a class="link"
      href="https://www.biorxiv.org/content/10.1101/2022.06.20.496929v1">a
      billion fold</a> from person to person. Within each person, it
      starts low, reaches a peak (often preceding symptoms), and then
      falls again as the infection comes under control. Based on our
      observations, we hypothesized that most groups exhibit the same
      range of viral loads. If true, then antigen tests (see below),
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
            <span class="bold">
                Please explore for yourself!
            </span>
        </p>
    
    </header>
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
        <div class="max80em">
            <h1 id="comparison_title" class="comparisons" >
                {#if (gData.populations.length == 1) }
                    Real-world Viral Loads, 2020&ndash;Present
                {/if}
                {#if (gData.populations.length > 1) }
                    Viral Loads
                    {#if hasSignificantDifferences(gData.populations) }
                        Vary
                    {:else}
                        Are Similar
                    {/if}
                    {#if !(gData.splitDescription) }
                      <span class="acrossbetween">
                        {#if (gData.populations.length == 2) }
                            Between
                        {:else if (gData.populations.length > 2) }
                            Across
                         {/if}
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
            <p class="too_many_groups hidden_style" class:showingBlock={gData.tooManyQueries}
                      id="too_many_groups">
                Displaying the first eight plots. Click subsets of the checkboxes to see more (eight at a time).
            </p>
        </div>
        <div class="max80emSplit" >
            <Histogram info={gData.populations} joy={true} highlightOne={true}
                           highlightedGroupLabel={highlightedGroupLabel}
                   y_scale={scaleOption} infectivityThreshold={infectivityThreshold} />
            <div class="meantext">
                <div id="pvalue_text" >
                    <div id="commentary">
                        {#each gData.populations as pop (pop.label)}
                            <p class="groupcomment"
                                    class:groupCommentSpace
                                    app_group_name={pop.label}
                                     on:mouseenter={mouseEnterAction}
                                     on:mouseleave={mouseLeaveAction} >
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
                        {/each}
                    </div>
                    {#if (gData.populations.length == 2) }
                        <div class="conclusiontext" >
                            <span class="vl_prefix" >
                                <strong>Statistics.</strong> Viral loads for
                            </span>
                            <span class="group1noun" >
                                {gData.populations[0].label}
                            </span>
                            and
                            <span class="group2noun" >
                                 {gData.populations[1].label}
                            </span>
                            <span class="conclusion">
                                {#if hasSignificantDifferences(gData.populations) }
                                    differ
                                {:else}
                                    are statistically indistinguishable
                                {/if}
                            </span>
                            <span class="pvalue">
                                {@html util.formatPValue(gData.populations[1].comparisons[0])}
                            </span><span class="period">.</span>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
        <p class="spacer" />
   <div class="antigen_text">
       <p class="body_text">
      To test whether between-group differences are significant, we
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
        <div class="max80emSplit" >
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
                    <img id="plegend" src="plegend.jpg" width="200px" />
                    <p class="plegend_text">
                       See the main text for more regarding this statistical approach.
                    </p>
                </div>
            {/if}
        </div>
   </div>
   <div class="antigen_text">  
        <h3>How can specific antigen tests be expected to perform on the
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
               <option value="none">-- select one --</option>
               {#each Object.keys(assayOptions) as assayId (assayId) }
                   <option value={assayId}>
                       {@html assayOptions[assayId].displayName}
                   </option>
               {/each}
           </select>
       </fieldset>
       <fieldset class="select_lod no_border" >
           <legend>Limit of detection (LOD)</legend>
           <input type="range" min="-1" max="12" bind:value={lod} 
                 class="slider" id="lod_slider" />
           {#if lod >= 0 }
               <span>
                   10<sup>{lod}</sup> copies of viral mRNA/mL
               </span>
           {/if}
       </fieldset>
    </div>
    <div class="max80em hidden_style" class:showingAntigenPerformance id="antihisto">
        <div class="antihisto_title">
            <h1 class="antigen">
                Performance of
                {#if assayOptions[selectedAssay]}
                    {@html assayOptions[selectedAssay].displayName}
                {:else if lod >= 0}
                    antigen test with an LOD of 10<sup>{lod}</sup>        
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
            <Histogram info={[selectedGroup]} catagories={["negatives", "positives"]}
                  joy={false} highlightOne={false}
                infectivityThreshold={infectivityThreshold} /> 
            <div class="performance_commentary">
                In
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
                    for detecting contagiousness is
                    <span class="senspec_value"g>
                        {sensitivity.toFixed(2)}
                    </span>
                {/if}
                {#if (specificity != undefined) }
                    and the
                    <span class="senspec_label">
                        specificity
                    </span>
                    is
                    <span class="senspec_value">
                        {specificity.toFixed(2)}.
                    </span>
                {/if}
                {#each ["positive", "negative"] as cat}
                  <p class="anti_legend" >
                    <svg height="1em" width="2em" 
                      fill={util.addAlpha(selectedGroup.colors[`${cat}s`][0],0.4)}
                      stroke={selectedGroup.colors[`${cat}s`][0]}
                      stroke-width="4" >
                        <ellipse cx="50%" cy="50%" rx="43%" ry="40%" />
                    </svg>
                    Predicted to test {cat} on the antigen test
                  </p>
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
            <input type="range" min="0" max="12" bind:value={infectivityThreshold}
                 class="slider" id="infectivityThreshold">
        </div>
      </details>
    </div>
    <footer>
        <h3>How did we estimate contagiousness?</h3>
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
        <h3>What if I have other questions, comments, or suggestions?</h3>
        <p class="body_text">We appreciate your feedback. Please email us
            at
            <a class="email" href="mailto:rarnaout@bidmc.harvard.edu">rarnaout@bidmc.harvard.edu</a>.
        </p>
    </footer>
</div>

<style>

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

</style>
