import { BATCH_STAGES } from '../utils/constants';
import './BatchStageBar.css';

const STEPS = ['BROODING', 'GROWING', 'FINISHING', 'READY', 'IN_STOCK'];

/** Age progress towards the target age, with the stage steps underneath. */
export default function BatchStageBar({ batch, compact = false }) {
  const currentStep = BATCH_STAGES[batch.stage]?.step || 0;
  return (
    <div className={`stage-bar ${compact ? 'stage-bar--compact' : ''} stage-bar--${batch.stage.toLowerCase()}`}>
      <div className="stage-bar__track" role="progressbar" aria-valuenow={batch.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Growth progress">
        <span className="stage-bar__fill" style={{ width: `${batch.stage === 'IN_STOCK' ? 100 : batch.progress}%` }} />
      </div>
      {!compact && (
        <ol className="stage-bar__steps">
          {STEPS.map((key) => {
            const step = BATCH_STAGES[key].step;
            const state = step < currentStep ? 'is-done' : step === currentStep ? 'is-current' : '';
            return (
              <li key={key} className={state}>
                <span />
                {BATCH_STAGES[key].label}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
