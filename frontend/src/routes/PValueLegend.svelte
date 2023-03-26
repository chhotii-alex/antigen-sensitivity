<script>

import * as util from './util.js';
import { scaleLinear } from 'd3-scale';

let clientWidth;
let clientHeight;

$: barHeight = clientHeight/2;
$: topEdge = clientHeight - barHeight;

$: xScale = scaleLinear().domain([-1, 13]).range([0, clientWidth]);

</script>

<div class="legend_box"
          bind:clientWidth={clientWidth} bind:clientHeight={clientHeight} >

  {#if !isNaN(topEdge)}
    <svg >
        {#each util.linspace(-0.25, 12.25, clientWidth) as p}
            <rect x={xScale(p)} y={topEdge} width="1" height={barHeight}
               stroke={util.colorForPValue(Math.pow(10, -p))}
               fill={util.colorForPValue(Math.pow(10, -p))} />
        {/each}
        {#each [0, 6, 12] as p}
            <g class="tick" transform={`translate(${xScale(p)},${topEdge})`} >
                <foreignObject width="3em" height="2em" x="-0.5em" y="-1.5em">
                    <div class="exponentlabel">
                       {#if (p==0)}
                          1
                       {:else}
                          10<sup>-{p}</sup>
                       {/if}
                    </div>
                </foreignObject>
            </g>
        {/each}
    </svg>
  {/if}
</div>

<style>

svg {
     overflow: visible;
}
div {
    font-weight: bold;
}
.legend_box {
  width: 100%;
  min-height: 4em;
  margin: -20px auto 10px;
  margin-bottom: 1.7em;
  max-width: 200px;
  max-height: 40px;
}
@media only screen and (max-width: 440px) {
  .legend_box {
     margin: 10px;
  }
}

</style>
