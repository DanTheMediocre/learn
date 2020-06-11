import React, { useState, useEffect } from 'react';
import classnames from 'classnames';
import Link from '@docusaurus/Link';
import styles from './styles.module.scss';

import CodeBlock from '@theme/CodeBlock'

export function Calculator() {
  const [state, setState] = React.useState({
    master: 1,
    slaves: 0,
    dims: 2000,
    update: 1,
    retention: 1,
    compression: 50,
    pageSize: 32,
  })

  const [requiredDisk, setrequiredDisk ] = React.useState('')
  const [totalDisk, setTotalDisk ] = React.useState('')
  const [diskSetting, setDiskSetting] = React.useState('')
  const [finalRAM, setFinalRAM] = React.useState('')
  const [conf, setConf] = React.useState('')

  useEffect(() => {
    const nodes = state.master + state.slaves
    const totalPoints = (state.dims / state.update) * state.retention * 24 * 3600
    const uncompressedPageSize = 4096
    const pointsPerPage = 1024
    const maxPages = totalPoints / pointsPerPage
    const pageSize = uncompressedPageSize / 1024 / 1024
    const uncompressedStorage = maxPages * pageSize

    // Required disk space for a single DB instance, enforcing a minimum of 64 MiB
    const nodeDiskSpace = uncompressedStorage * ( 1 - (state.compression / 100))
    const nodeDiskSpaceMin = nodeDiskSpace < 64 ? 64 : nodeDiskSpace

    // Required disk space for all DB instances
    const requiredDiskSpace = nodeDiskSpaceMin * nodes
    setrequiredDisk(Math.round(requiredDiskSpace))

    // Recommended dbengine disk space setting, enforcing a minimum of 64
    const diskSetting = (requiredDiskSpace / nodes) < 64 ? 64 : (requiredDiskSpace / nodes)
    setDiskSetting(Math.round(diskSetting))

    const cacheRAM = state.pageSize * nodes
    const dimPages = (nodes * state.dims) * uncompressedPageSize * 2 / 1024 / 1024
    const metadata = uncompressedStorage * 0.03
    const requiredRAM = cacheRAM + dimPages + metadata
    setFinalRAM(Math.round(requiredRAM))

    const confString = String.raw`[global]
    dbengine disk space = ${Math.round(diskSetting)}`
    setConf(confString)

  });

  const handleChange = (evt) => {
    const value = parseFloat(evt.target.value);
    setState({
      ...state,
      [evt.target.name]: value
    })
  }

  return (
    <div className={classnames('row', styles.dbCalc)}>
      <div className={'col col--12'}>
        <div className={classnames('row', styles.calcRow)}>
          <div className={classnames('col col--2', styles.calcInput)}>
            <input type="number" id="retention" name="retention" value={state.retention} min="0" onChange={handleChange} />
          </div>
          <div className={classnames('col col--10', styles.calcInstruction)}>
            <label htmlFor="retention">How many days do you want to store metrics?</label>
          </div>
        </div>

        <div className={classnames('row', styles.calcRow)}>
          <div className={classnames('col col--2', styles.calcInput)}>
            <input type="number" id="update" name="update" value={state.update} min="1" onChange={handleChange} />
          </div>
          <div className={classnames('col col--10', styles.calcInstruction)}>
            <label htmlFor="update">How often, on average, do your Agents collect metrics?</label>
            <p>By default, the Agent collects metrics once per second (<code>1</code>). See the <code>update every</code> setting in your <code>netdata.conf</code> file if yours may be different. If you have streaming nodes, use the average of their settings.</p>
          </div>
        </div>

        <div className={classnames('row', styles.calcRow)}>
          <div className={classnames('col col--2', styles.calcInput)}>
            <input type="number" id="dims" name="dims" min="0" value={state.dims} min="0" onChange={handleChange} />
          </div>
          <div className={classnames('col col--10', styles.calcInstruction)}>
            <label htmlFor="dims">How many metrics, on average, do your Agents collect?</label>
            <p>
              To find this value for an Agent, scroll to the bottom of the dashboard to find the number of metrics your Agent collects. If you have streaming nodes, input the average of these values.
            </p>
          </div>
        </div>

        <div className={classnames('row', styles.calcRow)}>
          <div className={classnames('col col--2', styles.calcInput)}>
            <input type="number" id="slaves" name="slaves" min="0" step="1" value={state.slaves} min="0" onChange={handleChange} />
          </div>
          <div className={classnames('col col--10', styles.calcInstruction)}>
            <label htmlFor="slaves">How many slave streaming nodes do you have?</label>
          </div>
        </div>

        <div className={classnames('row', styles.calcRow)}>
          <div className={classnames('col col--2', styles.calcInput)}>
            <input type="number" id="compression" name="compression" value={state.compression} min="0" onChange={handleChange} />
          </div>
          <div className={classnames('col col--10', styles.calcInstruction)}>
            <label htmlFor="compression">What is your compression savings ratio?</label>
            <p>To find this value, click on the <strong>Netdata Monitoring</strong> &rarr; <strong>dbengine</strong> items in the right-hand menu and look at the first chart under the <strong>dbengine</strong> section. You can also use your browser's search feature to look for <strong>compression savings ratio</strong>. Estimate an average value to input into the calculator.</p>
          </div>
        </div>

        <div className={classnames('row', styles.calcRow)}>
          <div className={classnames('col col--2', styles.calcInput)}>
            <input type="number" id="pageSize" name="pageSize" value={state.pageSize} min="8" onChange={handleChange} />
            
          </div>
          <div className={classnames('col col--10', styles.calcInstruction)}>
            <label htmlFor="pageSize">What is your page cache size?</label>
            <p>Open your <code>netdata.conf</code> file and find the <code>page cache size</code> setting in the <code>[global]</code> section.</p>
          </div>
        </div>
      </div>

      <div className={classnames("col col--12", styles.calcResults)}>

        <div className={styles.calcFinal}>
          <p>With the above configuration, you should allocate the following resources to metrics storage{state.slaves > 0 && <em>&nbsp;on your master node</em>}:</p>
          <span>
            <code>{requiredDisk} MiB</code> in total disk space
          </span>
          <span>
            <code>{finalRAM} MiB</code> in system memory
          </span>
        </div>

        <div className={styles.calcConfig}>
          <p>To enable this setup, edit the <code>netdata.conf</code> file&nbsp;
            {state.slaves > 0 &&
              <em>on your master node&nbsp;</em>
            }
            and change the <code>dbengine disk space</code> setting to the following:
          </p>
          <CodeBlock className={classnames('conf')} language='conf'>{conf}</CodeBlock>
          <p>Restart your Agent for the setting to take effect.</p>
          {state.slaves > 0 ? (
            <p>Your Agent now stores metrics for {state.master + state.slaves} nodes (one master and {state.slaves} slave{state.slaves > 1 && <span>s</span>}) for {state.retention} day{state.retention !== 1 && <span>s</span>} using a total of <code>{requiredDisk} MiB</code> in disk space.</p>
          ) : (
            <p>Your Agent now stores metrics for {state.retention} day{state.retention !== 1 && <span>s</span>} using a total of <code>{requiredDisk} MiB</code> in disk space.</p>
          )}
        </div>

        <div className={styles.calcNotes}>
          <h3>Notes</h3>
          <ul>
            {state.slaves > 0 && (
              <>
                <li>
                  <p>Your master node creates separate instances of the database engine for each of your slave nodes, and allocates <code>{diskSetting} MiB</code> to each of them. This is why you must allocate more total disk space than the <code>dbengine disk space</code> setting implies.</p>
                  <p><code>{diskSetting} MiB per instance * 1 master instance * {state.slaves} slave instance{state.slaves > 1 && <span>s</span>} = {requiredDisk} MiB</code></p>
                  <p>See the <Link href="/docs/agent/database/engine">dbengine documentation</Link> for details on how the Agent allocates database engine instances.</p>
                </li>
              </>
            )}
            <li>The database engine requires a minimum of 64 MiB to function (<code>dbengine disk space</code>).</li>
            <li>The system memory figure above is <em>only for the database engine</em>, and it may be higher in real-world situations due to memory fragmentation. The Agent will require more memory for collection, visualization, and alerting features.</li>
          </ul>
        </div>

      </div>

    </div>
  );
}
