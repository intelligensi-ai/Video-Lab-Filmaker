import { AssistantDirectorProposal, MasterBrief } from '../../types/film';

export interface IAssistantDirectorAdapter {
  name: string;
  isAvailable(): Promise<boolean>;
  propose(brief: MasterBrief): Promise<AssistantDirectorProposal>;
  revise(
    currentProposal: AssistantDirectorProposal,
    revisionRequest: string,
    brief: MasterBrief
  ): Promise<AssistantDirectorProposal>;
}
