import logging
import time
from services.llm import GeminiClient
from typing import Callable, Optional
from dataclasses import dataclass, field

logger=logging.getLogger(__name__)

@dataclass
class PipelineInput:
    text: str
    session_id: str
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None
    model: Optional[str] = None

@dataclass
class PipelineOutput:
    answer: str
    metadata: dict = field(default_factory=dict)

PreprocessFn=Callable[[PipelineInput], PipelineInput]
PostprocessFn=Callable[[PipelineOutput], PipelineOutput]

def strip_whitespace(input: PipelineInput)->PipelineInput:
    input.text=input.text.strip()
    return input

def validate_input(input:PipelineInput)->PipelineInput:
    if not input.text:
        raise ValueError("Input text cannot be empty")
    return input

def output_strip_whitespace(out: PipelineOutput) -> PipelineOutput:
    out.answer = out.answer.strip()
    return out

class IngestionPipeline:
    def __init__(
            self, 
            client:GeminiClient, 
            pre_steps: Optional[list[PreprocessFn]] = None,
            post_steps: Optional[list[PostprocessFn]] = None,):
        self.client=client
        self.pre_steps:list[PreprocessFn]=pre_steps or self._default_pre_steps()
        self.post_steps:list[PostprocessFn]=post_steps or self._default_post_steps()

    @staticmethod
    def _default_pre_steps() -> list[PreprocessFn]:
        return[
            strip_whitespace,
            validate_input
        ]
    @staticmethod
    def _default_post_steps()->list[PostprocessFn]:
        return[
            output_strip_whitespace
        ]
    
    def run(self,input:PipelineInput)->PipelineOutput:
        pipeline_start=time.perf_counter()

        for step in self.pre_steps:
            input=step(input)

        session_key=input.conversation_id or input.session_id
        response=self.client.send_msg(session_id=session_key, input=input.text, model=input.model)

        output=PipelineOutput(answer=response["response"], metadata=response["metadata"])

        for step in self.post_steps:
            output=step(output)

        output.metadata["pipeline_ms"]=round((time.perf_counter()-pipeline_start)*1000, 2)

        return output

    def run_stream(self, input: PipelineInput):

        pipeline_start = time.perf_counter()

        for step in self.pre_steps:
            input = step(input)

        session_key = input.conversation_id or input.session_id

        final_payload = None
        for kind, value in self.client.send_msg_stream(
            session_id=session_key, input=input.text, model=input.model
        ):
            if kind == "delta":
                yield ("delta", value)
            else:
                final_payload = value

        output = PipelineOutput(
            answer=final_payload["response"], metadata=final_payload["metadata"]
        )
        for step in self.post_steps:
            output = step(output)

        output.metadata["pipeline_ms"] = round((time.perf_counter() - pipeline_start) * 1000, 2)

        yield ("final", output)
        