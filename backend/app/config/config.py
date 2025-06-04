import os
from typing import Any, Dict, List, Optional, Union

from pydantic import validator

from pydantic_settings import BaseSettings


basedir = os.path.relpath(os.path.dirname(__file__))

class Settings(BaseSettings):

    ORIGINS: List[str] = ['*']

    @validator("ORIGINS", pre=True)
    def assemble_origin(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    
    
    
    
    GITLAB_CLIENT_ID: str
    GITLAB_CLIENT_SECRET: str
    GITLAB_REDIRECT_URI: str
    
    
    
    
    
    
    
    LOG_FILE: str = './uar.log'


    class Config:
        env_file = os.path.join(basedir, '../.env')


settings = Settings()
