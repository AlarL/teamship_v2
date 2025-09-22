import { playerActions } from '@/state/actions/player-actions';
import { useSnapshot } from 'valtio';
import { playerStore } from '@/state/stores/player-store';
import * as React from 'react';

const EnterNameView: React.FC = () => {
  const { displayName } = useSnapshot(playerStore.proxy);
  const [name, setName] = React.useState(displayName);

  const canContinue = name.trim().length >= 2;

  const onContinue = async () => {
    await playerActions.setDisplayName(name.trim());
    await playerActions.goTo('create-or-join');
  };

  return (
    <div className="grid min-h-dvh place-items-center p-4 lg:p-6">
      <div className="card bg-base-100 w-full max-w-96 shadow-sm">
        <div className="card-body space-y-6">
          <h2 className="card-title">Enter your name</h2>
          <input
            className="input input-bordered w-full"
            value={name}
            placeholder="Your display name"
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
          />
          <button
            className="btn btn-primary btn-lg w-full"
            onClick={onContinue}
            disabled={!canContinue}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnterNameView;

